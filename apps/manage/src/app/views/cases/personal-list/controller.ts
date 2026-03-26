import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { ManageService } from '#service';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import { casesToViewModel } from './view-model.ts';
import { CASE_STATUSES } from '@pins/peas-row-commons-database/src/seed/static_data/status.ts';

/**
 * Safely extracts a single string from an Express query parameter,
 * preventing crashes if a user tampers with the URL (?status=open&status=closed).
 * In that scenario will jsut grab item 1
 */
function getQueryString(param: unknown): string | undefined {
	if (!param) return undefined;
	return Array.isArray(param) ? String(param[0]) : String(param);
}

/**
 * Fetches a user's assigned cases as either case officer or insepector
 */
function fetchCasesForUser(db: ManageService['db'], userId: string, statusFilter?: string) {
	return db.case.findMany({
		where: {
			...(statusFilter && statusFilter !== 'all' ? { Status: { id: statusFilter } } : {}),
			OR: [{ CaseOfficer: { idpUserId: userId } }, { Inspectors: { some: { Inspector: { idpUserId: userId } } } }]
		},
		include: {
			Status: true,
			CaseOfficer: true,
			Inspectors: { include: { Inspector: true } }
		}
	});
}

export function buildViewPersonalList(service: ManageService): AsyncRequestHandler {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const selectedUserId = getQueryString(req.query?.userId);
		const status = getQueryString(req.query?.status);
		const userId = selectedUserId || req.session?.account?.localAccountId;

		if (!userId) {
			throw new Error('Cannot get personal cases without a userId');
		}

		logger.info({ userId, statusFilter: status }, 'Fetching personal list data');

		const [personalCases, groupMembers] = await Promise.all([
			fetchCasesForUser(db, userId, status),
			getEntraGroupMembers({
				logger,
				initClient: getEntraClient,
				session: req.session,
				groupIds
			})
		]);

		logger.info(
			{ userId, caseCount: personalCases.length, groupMemberCount: groupMembers?.allUsers?.length || 0 },
			'Successfully fetched and combined personal list data'
		);

		const userName = groupMembers?.allUsers?.find((member) => member.id === userId)?.displayName;

		// If we have attempted to view a specific user, and they are not in Entra, redirect back to personal page
		if (selectedUserId && !userName) {
			logger.warn({ userId }, 'Submitted userId does not match any active case officers in Entra.');
			return res.redirect('/cases/personal-list');
		}

		const baseSelectUserUrl = '/cases/personal-list/select-user';
		const viewAnotherHref = selectedUserId
			? `${baseSelectUserUrl}?previousUserId=${selectedUserId}`
			: baseSelectUserUrl;

		return res.render('views/cases/personal-list/view.njk', {
			cases: casesToViewModel(personalCases, groupMembers),
			pageHeading: `Cases assigned to ${selectedUserId ? userName : 'you'}`,
			noCasesHeading: `${selectedUserId ? `${userName} is` : 'You are'} not assigned to any cases`,
			currentPage: 'personal-list',
			statusParams: {
				caseStatuses: CASE_STATUSES,
				currentStatus: status
			},
			selectedUserId,
			viewAnotherHref
		});
	};
}

/**
 * Builds a view for the user to select another user to see their assigned
 * cases
 */
export function buildSelectUserView(service: ManageService): AsyncRequestHandler {
	const { logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const { previousUserId } = req.query;
		const currentUserId = req?.session?.account?.localAccountId;

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		// We don't want to allow a user to select themselves because
		// it is redundant to their experience.
		const users = groupMembers?.allUsers
			?.map((member) => ({
				text: member.displayName,
				value: member.id
			}))
			.filter((user) => user.value !== currentUserId);

		users.unshift({ text: '', value: '' });

		const baseBackLinkUrl = '/cases/personal-list';

		const backLinkUrl =
			previousUserId && users.find((user) => user.value === previousUserId)
				? `${baseBackLinkUrl}?userId=${previousUserId}`
				: baseBackLinkUrl;

		return res.render('views/cases/personal-list/select-user.njk', {
			options: users,
			backLinkUrl,
			currentPage: 'personal-list'
		});
	};
}

/**
 * Redirects user back to the personal-list page with a query param
 * with the selected user (if validated)
 */
export function buildFindSelectedUser(service: ManageService): AsyncRequestHandler {
	const { logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const { userId } = req.body;

		if (!userId) {
			logger.warn('No userId provided in form submission.');
			return res.redirect('/cases/personal-list');
		}

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		const isValidUser = groupMembers?.allUsers?.some((member) => member.id === userId);

		if (!isValidUser) {
			logger.warn({ userId }, 'Submitted userId does not match any active users in Entra.');
			return res.redirect('/cases/personal-list');
		}

		return res.redirect(`/cases/personal-list?userId=${userId}`);
	};
}
