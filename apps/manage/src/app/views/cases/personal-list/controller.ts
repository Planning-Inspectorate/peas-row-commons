import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { ManageService } from '#service';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import { casesToViewModel } from './view-model.ts';
import { CASE_STATUSES } from '@pins/peas-row-commons-database/src/seed/static_data/status.ts';

export function buildViewPersonalList(service: ManageService): AsyncRequestHandler {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const userId = req?.session?.account?.localAccountId;

		const statusParam = req.query.status;
		const status = Array.isArray(statusParam) ? statusParam[0] : statusParam;

		if (!userId) {
			throw new Error('Cannot get personal cases without a userId');
		}

		logger.info({ userId, statusFilter: status }, 'Fetching personal list data');

		const casesPromise = db.case.findMany({
			where: {
				...(status && status !== 'all' ? { Status: { id: status as string } } : {}),
				OR: [{ CaseOfficer: { idpUserId: userId } }, { Inspectors: { some: { Inspector: { idpUserId: userId } } } }]
			},
			include: {
				Status: true,
				CaseOfficer: true,
				Inspectors: { include: { Inspector: true } }
			}
		});

		const entraPromise = getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		// We can run these concurrently because they are unrelated requests, 1 to db, 1 to entra
		const [personalCases, groupMembers] = await Promise.all([casesPromise, entraPromise]);

		logger.info(
			{
				userId,
				caseCount: personalCases.length,
				groupMemberCount: groupMembers.allUsers?.length || 0
			},
			'Successfully fetched and combined personal list data'
		);

		const caseViewModels = casesToViewModel(personalCases, groupMembers);

		return res.render('views/cases/personal-list/view.njk', {
			cases: caseViewModels,
			pageHeading: 'Cases assigned to you',
			currentPage: 'personal-list',
			statusParams: {
				caseStatuses: CASE_STATUSES,
				currentStatus: status
			}
		});
	};
}
