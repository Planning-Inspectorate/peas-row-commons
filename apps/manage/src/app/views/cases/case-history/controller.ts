import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import { createCaseHistoryViewModel } from './view-model.ts';
import { getPageData, getPaginationParams } from '../../pagination/pagination-utils.ts';
import { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';

export function buildViewCaseHistory(service: ManageService): AsyncRequestHandler {
	const { db, audit, logger, getEntraClient } = service;
	const groupId = service.authConfig.groups.applicationAccess;

	return async (req, res) => {
		const { id } = req.params;

		if (!id) {
			throw new Error('id param required');
		}

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

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupId
		});

		logger.info(
			{
				eventUserIds: events.map((e) => e.userId),
				groupMemberIds: groupMembers.caseOfficers.map((m) => ({ id: m.id, displayName: m.displayName })),
				sessionUserId: req?.session?.account?.localAccountId
			},
			'user ID comparison'
		);

		const userMap = new Map(groupMembers.caseOfficers.map((member) => [member.id, member.displayName]));

		const eventsWithUserNames = events.map((event) => ({
			...event,
			userName: userMap.get(event.User?.idpUserId ?? '') ?? 'Unknown User'
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
