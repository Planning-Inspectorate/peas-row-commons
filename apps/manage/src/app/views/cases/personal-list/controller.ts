import type { ManageService } from '#service';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CASE_STATUSES } from '@pins/peas-row-commons-database/src/seed/static-data/status.ts';
import { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';
import { getSortHeaders, type SortableColumn } from '@pins/peas-row-commons-lib/util/sort-headers.ts';
import { getSortQueries } from '@pins/peas-row-commons-lib/util/sort-queries.ts';
import type { AsyncRequestHandler, AsyncRequestHandlerWithBody } from '@planning-inspectorate/core/util';
import { getPageData, getPaginationParams } from '../../pagination/pagination-utils.ts';
import { casesToViewModel } from './view-model.ts';

type PersonalListSortKey = 'reference' | 'name' | 'receivedDate' | 'statusId';

type PersonalListSort = {
	sortField: PersonalListSortKey;
	sortOrder: Prisma.SortOrder;
};

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
function fetchCasesForUser(
	db: ManageService['db'],
	userId: string,
	statusFilter: string | undefined,
	skipSize: number,
	pageSize: number,
	orderBy: PersonalListSort
) {
	const where = buildPersonalListWhereClause(userId, statusFilter);

	let primaryOrder: Prisma.CaseOrderByWithRelationInput;

	switch (orderBy.sortField) {
		case 'reference':
			primaryOrder = { reference: orderBy.sortOrder };
			break;
		case 'name':
			primaryOrder = { name: orderBy.sortOrder };
			break;
		case 'receivedDate':
			primaryOrder = { receivedDate: orderBy.sortOrder };
			break;
		case 'statusId':
			primaryOrder = { Status: { displayName: orderBy.sortOrder } };
			break;
	}

	return db.case.findMany({
		where,
		include: {
			Status: true,
			CaseOfficer: true,
			Inspectors: { include: { Inspector: true } }
		},
		orderBy: [primaryOrder, { id: 'asc' }],
		skip: skipSize,
		take: pageSize
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

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		const headerFields = [
			{ key: 'reference', label: 'Reference', classes: 'pins-width-one-sixth' },
			{ key: 'name', label: 'Case name', classes: 'pins-width-one-sixth' },
			{ key: 'receivedDate', label: 'Received', classes: 'pins-width-one-sixth' },
			{ key: 'statusId', label: 'Status', classes: 'pins-width-one-sixth' }
		] satisfies (SortableColumn & { key: PersonalListSortKey })[];

		const sanitisedOrderByQuery = getSortQueries<Record<PersonalListSortKey, Prisma.SortOrder>>(req, {
			sortBy: 'receivedDate',
			sortOrder: 'desc',
			allowedFields: headerFields.map((field) => field.key)
		});

		const sortParams = new URLSearchParams();
		sortParams.set('sortBy', sanitisedOrderByQuery.sortField);
		sortParams.set('order', sanitisedOrderByQuery.sortOrder);
		const sortValue = `&${sortParams.toString()}`;
		const clearFilterParams = new URLSearchParams(sortParams);

		if (selectedUserId) {
			clearFilterParams.set('userId', selectedUserId);
		}

		const clearFilterUrl = `/cases/personal-list?${clearFilterParams.toString()}`;

		logger.info({ userId, statusFilter: status }, 'Fetching personal list data');

		const [personalCases, totalCases, groupMembers] = await Promise.all([
			fetchCasesForUser(db, userId, status, skipSize, pageSize, sanitisedOrderByQuery),
			countCasesForUser(db, userId, status),
			getEntraGroupMembers({
				logger,
				initClient: getEntraClient,
				session: req.session,
				groupIds
			})
		]);

		const cases = casesToViewModel(personalCases, groupMembers);

		const sortableHeaders = getSortHeaders(req, headerFields, sanitisedOrderByQuery);

		const sortHeaders = [
			...sortableHeaders.slice(0, 2),
			{
				text: 'Case officer',
				classes: 'pins-width-one-sixth'
			},
			{
				text: 'Inspector',
				classes: 'pins-width-one-sixth'
			},
			...sortableHeaders.slice(2)
		];

		logger.info(
			{ userId, caseCount: personalCases.length, groupMemberCount: groupMembers?.allUsers?.length || 0 },
			'Successfully fetched and combined personal list data'
		);

		const userName = groupMembers?.allUsers?.find((member) => member.id === userId)?.displayName;

		const totalPages = Math.ceil((totalCases || 0) / pageSize);
		const { resultsStartNumber, resultsEndNumber } = getPageData(
			totalCases || 0,
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
			totalCases,
			uiItems: paginationItems,
			sortValue
		};

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
			cases,
			sortHeaders,
			sorting: {
				sortBy: sanitisedOrderByQuery.sortField,
				order: sanitisedOrderByQuery.sortOrder
			},
			pageHeading: `Cases assigned to ${selectedUserId ? userName : 'you'}`,
			noCasesHeading: `${selectedUserId ? `${userName} is` : 'You are'} not assigned to any cases`,
			currentPage: 'personal-list',
			statusParams: {
				caseStatuses: CASE_STATUSES,
				currentStatus: status
			},
			selectedUserId,
			viewAnotherHref,
			paginationParams,
			clearFilterUrl
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
export function buildFindSelectedUser(service: ManageService): AsyncRequestHandlerWithBody<{ userId: string }> {
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

/**
 * Builds the where clause for filtering a user's assigned cases.
 *
 * Needed for consistency between findMany and count queries during pagination.
 */
function buildPersonalListWhereClause(userId: string, statusFilter?: string) {
	return {
		...(statusFilter && statusFilter !== 'all' ? { Status: { id: statusFilter } } : {}),
		OR: [{ CaseOfficer: { idpUserId: userId } }, { Inspectors: { some: { Inspector: { idpUserId: userId } } } }]
	};
}

/**
 * Counts the total number of cases assigned to a user.
 */
function countCasesForUser(db: ManageService['db'], userId: string, statusFilter?: string) {
	return db.case.count({
		where: buildPersonalListWhereClause(userId, statusFilter)
	});
}
