import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import { createCaseHistoryViewModel } from './view-model.ts';

const PAGE_SIZE = 50;

export function buildViewCaseHistory(service: ManageService): AsyncRequestHandler {
	const { db, audit, logger, getEntraClient } = service;
	const groupId = service.authConfig.groups.applicationAccess;

	return async (req, res) => {
		const { id } = req.params;

		if (!id) {
			throw new Error('id param required');
		}

		const page = Math.max(0, Number(req.query.page ?? 0));

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

		const [events, totalCount] = await Promise.all([
			audit.getAllForCase(id, {
				skip: page * PAGE_SIZE,
				take: PAGE_SIZE
			}),
			audit.countForCase(id)
		]);

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupId
		});

		const userMap = new Map(groupMembers.caseOfficers.map((member) => [member.id, member.displayName]));

		const eventsWithUserNames = events.map((event) => ({
			...event,
			userName: userMap.get(event.userId) ?? 'Unknown User'
		}));

		const rows = createCaseHistoryViewModel(eventsWithUserNames);
		const totalPages = Math.ceil(totalCount / PAGE_SIZE);

		return res.render('views/cases/case-history/view.njk', {
			pageHeading: 'Case history',
			reference: caseRow.reference,
			backLinkUrl: `/cases/${id}`,
			backLinkText: 'Back to case details',
			rows,
			pagination: {
				currentPage: page,
				totalPages,
				totalCount
			}
		});
	};
}
