import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { getUserDisplayName, getUserDisplayNames } from '#util/entra-groups.ts';
import { createCaseHistoryViewModel } from './view-model.ts';
import { getPageData, getPaginationParams } from '../../pagination/pagination-utils.ts';
import { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';
import { isDefined } from '@pins/peas-row-commons-lib/util/type-predicate.ts';
import { getStringParam } from '@pins/peas-row-commons-lib/util/params.ts';

export function buildViewCaseHistory(service: ManageService): AsyncRequestHandler {
	const { db, audit, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		let caseRow;
		try {
			caseRow = await db.case.findUnique({
				select: {
					name: true,
					reference: true
				},
				where: { id }
			});
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching case for history',
				logParams: {}
			});
		}

		if (!caseRow) {
			return notFoundHandler(req, res);
		}

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		const [events, totalCount] = await Promise.all([
			audit.getAllForCase(id, { take: pageSize, skip: skipSize }),
			audit.countForCase(id)
		]);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalCount || 0,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

		const paginationItems = getPaginationModel(req, totalPages, pageNumber);

		const paginationParams = {
			selectedItemsPerPage,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			totalCount,
			uiItems: paginationItems
		};

		const userIds = events.map((event) => event.User?.idpUserId).filter(isDefined);

		const { groupMembers, userMap } = await getUserDisplayNames(userIds, {
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		logger.info(
			{
				eventCount: events.length,
				uniqueUserIds: userIds.length,
				groupMembersFound: groupMembers.allUsers.length
			},
			'case history user lookup summary'
		);

		const eventsWithUserNames = events.map((event) => ({
			...event,
			userName: getUserDisplayName(userMap, event.User?.idpUserId)
		}));

		const rows = createCaseHistoryViewModel(eventsWithUserNames);

		return res.render('views/cases/case-history/view.njk', {
			pageHeading: 'Case history',
			reference: caseRow.reference,
			backLinkUrl: `/cases/${id}`,
			backLinkText: 'Back to case details',
			rows,
			paginationParams
		});
	};
}
