import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { buildViewPersonalList, buildSelectUserView, buildFindSelectedUser } from './controller.ts';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '#service';

type MockRes = Omit<Response, 'render' | 'status' | 'redirect'> & {
	render: ReturnType<typeof mock.fn>;
	status: ReturnType<typeof mock.fn>;
	redirect: ReturnType<typeof mock.fn>;
	locals: Record<string, unknown>;
};

type FindManyArgs = {
	where: {
		Status?: { id: string };
		OR?: Array<{
			CaseOfficer?: { idpUserId: string };
			Inspectors?: { some: { Inspector: { idpUserId: string } } };
		}>;
	};
};

type RenderLocals = {
	pageHeading?: string;
	currentPage?: string;
	statusParams?: { currentStatus?: string; caseStatuses?: unknown[] };
	cases?: Array<{ caseOfficerName?: string }>;
	options?: Array<{ text: string; value: string }>;
	backLinkUrl?: string;
};

const buildMockRes = (): MockRes => {
	const resObj = { locals: {} } as MockRes;

	resObj.render = mock.fn((_view: string, _locals: unknown) => {});
	resObj.status = mock.fn((_code: number) => resObj);
	resObj.redirect = mock.fn((_url: string) => {});

	return resObj;
};

const buildMockReq = (overrides: Record<string, unknown> = {}): Request =>
	({
		query: {},
		body: {},
		session: { account: { localAccountId: 'user-123' } },
		...overrides
	}) as unknown as Request;

const buildPaginatedMockReq = (overrides: Record<string, unknown> = {}): Request =>
	buildMockReq({
		originalUrl: '/cases/personal-list',
		baseUrl: '',
		path: '/cases/personal-list',
		...overrides
	});

const buildService = (
	findManyMock: ReturnType<typeof mock.fn>,
	countMock: ReturnType<typeof mock.fn> = mock.fn(() => Promise.resolve(0))
): ManageService =>
	({
		db: { case: { findMany: findManyMock, count: countMock } } as unknown as ManageService['db'],
		entraGroupIds: {
			allUsers: '123',
			inspectors: '123',
			caseOfficers: '123'
		},
		logger: {
			info: mock.fn((_msg: string) => {}),
			error: mock.fn((_msg: string) => {}),
			warn: mock.fn((_msg: string) => {})
		} as unknown as ManageService['logger'],
		getEntraClient: () => ({
			listAllGroupMembers: async () => [
				{ id: 'user-123', displayName: 'Jane Smith' },
				{ id: 'user-2', displayName: 'John Doe' }
			]
		}),
		authConfig: { groups: { applicationAccess: 'group-1' } }
	}) as unknown as ManageService;

const nextMock = mock.fn((_err?: unknown) => {}) as unknown as NextFunction;

describe('Personal List Controllers', () => {
	describe('buildViewPersonalList', () => {
		describe('Validation & Routing', () => {
			it('should throw error if userId is missing from session', async () => {
				const req = buildMockReq({ session: { account: null } });
				const res = buildMockRes();

				await assert.rejects(
					() => buildViewPersonalList(buildService(mock.fn()))(req, res as unknown as Response, nextMock),
					{ message: 'Cannot get personal cases without a userId' }
				);
			});

			it('should redirect if an invalid selectedUserId is passed in the query', async () => {
				const req = buildMockReq({ query: { userId: 'fake-user-999' } });
				const res = buildMockRes();

				await buildViewPersonalList(buildService(mock.fn(() => Promise.resolve([]))))(
					req,
					res as unknown as Response,
					nextMock
				);

				assert.strictEqual(res.redirect.mock.callCount(), 1);
				assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/personal-list');
				assert.strictEqual(res.render.mock.callCount(), 0);
			});
		});

		describe('Happy Path', () => {
			it('should fetch cases for session user and render the view with correct heading and case officer name', async () => {
				const req = buildMockReq();
				const res = buildMockRes();

				const findManyMock = mock.fn(() =>
					Promise.resolve([
						{
							id: 'case-1',
							reference: 'REF-001',
							CaseOfficer: { idpUserId: 'user-123' },
							Inspectors: [],
							receivedDate: new Date('2025-01-15T14:30:00Z')
						}
					])
				);

				await buildViewPersonalList(buildService(findManyMock))(req, res as unknown as Response, nextMock);

				assert.strictEqual(findManyMock.mock.callCount(), 1);

				// Verifies where clause shape — no status filter, OR covers both case officer and inspector
				const dbArgs = findManyMock.mock.calls[0].arguments[0] as unknown as FindManyArgs;
				assert.strictEqual(dbArgs.where.Status, undefined);
				assert.deepStrictEqual(dbArgs.where.OR, [
					{ CaseOfficer: { idpUserId: 'user-123' } },
					{ Inspectors: { some: { Inspector: { idpUserId: 'user-123' } } } }
				]);

				const [viewPath, viewData] = res.render.mock.calls[0].arguments as [string, RenderLocals];
				assert.strictEqual(viewPath, 'views/cases/personal-list/view.njk');
				assert.strictEqual(viewData.pageHeading, 'Cases assigned to you');
				assert.strictEqual(viewData.statusParams?.currentStatus, undefined);
				assert.strictEqual(viewData.cases?.[0].caseOfficerName, 'Jane Smith');
			});

			it('should use selectedUserId in where clause and adjust heading when viewing another users cases', async () => {
				const req = buildMockReq({ query: { userId: 'user-2' } });
				const res = buildMockRes();

				const findManyMock = mock.fn(() => Promise.resolve([]));

				await buildViewPersonalList(buildService(findManyMock))(req, res as unknown as Response, nextMock);

				const viewData = res.render.mock.calls[0].arguments[1] as RenderLocals;
				assert.strictEqual(viewData.pageHeading, 'Cases assigned to John Doe');

				const dbArgs = findManyMock.mock.calls[0].arguments[0] as unknown as FindManyArgs;
				assert.deepStrictEqual(dbArgs.where.OR, [
					{ CaseOfficer: { idpUserId: 'user-2' } },
					{ Inspectors: { some: { Inspector: { idpUserId: 'user-2' } } } }
				]);
			});

			it('should add Status to where clause when a specific status is provided', async () => {
				const req = buildMockReq({ query: { status: 'new-case' } });
				const res = buildMockRes();

				const findManyMock = mock.fn(() => Promise.resolve([]));
				const countMock = mock.fn(() => Promise.resolve(0));

				await buildViewPersonalList(buildService(findManyMock, countMock))(req, res as unknown as Response, nextMock);

				const dbArgs = findManyMock.mock.calls[0].arguments[0] as unknown as FindManyArgs;
				assert.deepStrictEqual(dbArgs.where.Status, { id: 'new-case' });

				// Verify count uses the same where clause as findMany
				const countArgs = countMock.mock.calls[0].arguments[0] as unknown as { where: FindManyArgs['where'] };
				assert.deepStrictEqual(countArgs.where.Status, { id: 'new-case' });

				const viewData = res.render.mock.calls[0].arguments[1] as RenderLocals;
				assert.strictEqual(viewData.statusParams?.currentStatus, 'new-case');
			});

			it('should NOT add Status to where clause when status is "all"', async () => {
				const req = buildMockReq({ query: { status: 'all' } });
				const res = buildMockRes();

				const findManyMock = mock.fn(() => Promise.resolve([]));

				await buildViewPersonalList(buildService(findManyMock))(req, res as unknown as Response, nextMock);

				const dbArgs = findManyMock.mock.calls[0].arguments[0] as unknown as FindManyArgs;
				assert.strictEqual(dbArgs.where.Status, undefined);
			});
		});

		describe('Error Handling', () => {
			it('should propagate DB errors', async () => {
				const req = buildMockReq();
				const res = buildMockRes();

				const findManyMock = mock.fn(() => Promise.reject(new Error('Connection refused')));

				await assert.rejects(
					() => buildViewPersonalList(buildService(findManyMock))(req, res as unknown as Response, nextMock),
					{ message: 'Connection refused' }
				);

				assert.strictEqual(res.render.mock.callCount(), 0);
			});
		});

		describe('Pagination', () => {
			it('should pass paginationParams to the view with correct defaults', async () => {
				const req = buildPaginatedMockReq();
				const res = buildMockRes();

				const countMock = mock.fn(() => Promise.resolve(42));

				await buildViewPersonalList(
					buildService(
						mock.fn(() => Promise.resolve([])),
						countMock
					)
				)(req, res as unknown as Response, nextMock);

				const { paginationParams } = res.render.mock.calls[0].arguments[1] as any;

				assert.ok(paginationParams, 'paginationParams should be passed to the view');
				assert.strictEqual(paginationParams.totalCases, 42);
				assert.strictEqual(paginationParams.selectedItemsPerPage, 25);
				assert.strictEqual(paginationParams.pageNumber, 1);
				assert.strictEqual(paginationParams.totalPages, 2);
				assert.strictEqual(paginationParams.resultsStartNumber, 1);
				assert.strictEqual(paginationParams.resultsEndNumber, 25);
			});

			it('should show 1 page with no navigation when cases fit within 25 item default', async () => {
				const req = buildPaginatedMockReq();
				const res = buildMockRes();

				await buildViewPersonalList(
					buildService(
						mock.fn(() => Promise.resolve([])),
						mock.fn(() => Promise.resolve(25))
					)
				)(req, res as unknown as Response, nextMock);

				const { paginationParams } = res.render.mock.calls[0].arguments[1] as any;

				assert.strictEqual(paginationParams.totalPages, 1);
				assert.strictEqual(paginationParams.resultsStartNumber, 1);
				assert.strictEqual(paginationParams.resultsEndNumber, 25);
				assert.strictEqual(paginationParams.uiItems.items.length, 0);
				assert.strictEqual(paginationParams.uiItems.next, null);
				assert.strictEqual(paginationParams.uiItems.previous, null);
			});

			it('should show 1 page when cases exactly match the selected page size for 50 and 100', async () => {
				for (const pageSize of [50, 100]) {
					const req = buildPaginatedMockReq({
						query: { itemsPerPage: String(pageSize), page: '1' },
						originalUrl: `/cases/personal-list?itemsPerPage=${pageSize}&page=1`
					});
					const res = buildMockRes();

					await buildViewPersonalList(
						buildService(
							mock.fn(() => Promise.resolve([])),
							mock.fn(() => Promise.resolve(pageSize))
						)
					)(req, res as unknown as Response, nextMock);

					const { paginationParams } = res.render.mock.calls[0].arguments[1] as any;

					assert.strictEqual(paginationParams.totalPages, 1, `Expected 1 page for ${pageSize} items per page`);
					assert.strictEqual(paginationParams.selectedItemsPerPage, pageSize);
					assert.strictEqual(paginationParams.uiItems.next, null);
					assert.strictEqual(paginationParams.uiItems.previous, null);
				}
			});

			it('should create a second page when cases exceed the selected page size by 1', async () => {
				for (const pageSize of [25, 50, 100]) {
					const req = buildPaginatedMockReq({
						query: { itemsPerPage: String(pageSize), page: '1' },
						originalUrl: `/cases/personal-list?itemsPerPage=${pageSize}&page=1`
					});
					const res = buildMockRes();

					await buildViewPersonalList(
						buildService(
							mock.fn(() => Promise.resolve([])),
							mock.fn(() => Promise.resolve(pageSize + 1))
						)
					)(req, res as unknown as Response, nextMock);

					const { paginationParams } = res.render.mock.calls[0].arguments[1] as any;

					assert.strictEqual(
						paginationParams.totalPages,
						2,
						`Expected 2 pages for ${pageSize + 1} cases at ${pageSize} per page`
					);
					assert.ok(paginationParams.uiItems.next, 'should have a next page link');
					assert.strictEqual(paginationParams.uiItems.previous, null);
				}
			});

			it('should show correct result window on a middle page', async () => {
				const req = buildPaginatedMockReq({
					query: { itemsPerPage: '25', page: '2' },
					originalUrl: '/cases/personal-list?itemsPerPage=25&page=2'
				});
				const res = buildMockRes();

				await buildViewPersonalList(
					buildService(
						mock.fn(() => Promise.resolve([])),
						mock.fn(() => Promise.resolve(60))
					)
				)(req, res as unknown as Response, nextMock);

				const { paginationParams } = res.render.mock.calls[0].arguments[1] as any;

				assert.strictEqual(paginationParams.resultsStartNumber, 26);
				assert.strictEqual(paginationParams.resultsEndNumber, 50);
				assert.ok(paginationParams.uiItems.previous, 'should have a previous page link');
				assert.ok(paginationParams.uiItems.next, 'should have a next page link');
			});

			it('should show correct result window on a partial last page', async () => {
				const req = buildPaginatedMockReq({
					query: { itemsPerPage: '25', page: '3' },
					originalUrl: '/cases/personal-list?itemsPerPage=25&page=3'
				});
				const res = buildMockRes();

				await buildViewPersonalList(
					buildService(
						mock.fn(() => Promise.resolve([])),
						mock.fn(() => Promise.resolve(60))
					)
				)(req, res as unknown as Response, nextMock);

				const { paginationParams } = res.render.mock.calls[0].arguments[1] as any;

				assert.strictEqual(paginationParams.totalPages, 3);
				assert.strictEqual(paginationParams.pageNumber, 3);
				assert.strictEqual(paginationParams.resultsStartNumber, 51);
				assert.strictEqual(paginationParams.resultsEndNumber, 60);
				assert.ok(paginationParams.uiItems.previous, 'should have a previous page link');
				assert.strictEqual(paginationParams.uiItems.next, null);
			});

			it('should show 0 total cases and no pagination when count returns 0', async () => {
				const req = buildPaginatedMockReq();
				const res = buildMockRes();

				await buildViewPersonalList(
					buildService(
						mock.fn(() => Promise.resolve([])),
						mock.fn(() => Promise.resolve(0))
					)
				)(req, res as unknown as Response, nextMock);

				const { paginationParams } = res.render.mock.calls[0].arguments[1] as any;

				assert.strictEqual(paginationParams.totalCases, 0);
				assert.strictEqual(paginationParams.totalPages, 0);
				assert.strictEqual(paginationParams.uiItems.items.length, 0);
				assert.strictEqual(paginationParams.uiItems.next, null);
				assert.strictEqual(paginationParams.uiItems.previous, null);
			});

			it('should fall back to 100 effective page size when an invalid itemsPerPage is provided', async () => {
				const req = buildPaginatedMockReq({
					query: { itemsPerPage: '999' },
					originalUrl: '/cases/personal-list?itemsPerPage=999'
				});
				const res = buildMockRes();

				await buildViewPersonalList(
					buildService(
						mock.fn(() => Promise.resolve([])),
						mock.fn(() => Promise.resolve(10))
					)
				)(req, res as unknown as Response, nextMock);

				const { paginationParams } = res.render.mock.calls[0].arguments[1] as any;

				assert.strictEqual(paginationParams.selectedItemsPerPage, 999);
				assert.strictEqual(paginationParams.totalPages, 1); // 10 cases / 100 effective page size
			});
		});
	});

	describe('buildSelectUserView', () => {
		it('should render the select view and filter out the current user', async () => {
			const req = buildMockReq();
			const res = buildMockRes();

			await buildSelectUserView(buildService(mock.fn(() => Promise.resolve([]))))(
				req,
				res as unknown as Response,
				nextMock
			);

			const [viewPath, viewData] = res.render.mock.calls[0].arguments as [string, RenderLocals];

			assert.strictEqual(viewPath, 'views/cases/personal-list/select-user.njk');
			assert.strictEqual(viewData.options?.length, 2);
			assert.deepStrictEqual(viewData.options?.[0], { text: '', value: '' });
			assert.deepStrictEqual(viewData.options?.[1], { text: 'John Doe', value: 'user-2' });
			assert.strictEqual(viewData.backLinkUrl, '/cases/personal-list');
		});

		it('should append previousUserId to the back link if it is valid', async () => {
			const req = buildMockReq({ query: { previousUserId: 'user-2' } });
			const res = buildMockRes();

			await buildSelectUserView(buildService(mock.fn(() => Promise.resolve([]))))(
				req,
				res as unknown as Response,
				nextMock
			);

			const viewData = res.render.mock.calls[0].arguments[1] as RenderLocals;
			assert.strictEqual(viewData.backLinkUrl, '/cases/personal-list?userId=user-2');
		});

		it('should NOT append previousUserId to the back link if it is invalid/forged', async () => {
			const req = buildMockReq({ query: { previousUserId: 'fake-hacker-id' } });
			const res = buildMockRes();

			await buildSelectUserView(buildService(mock.fn(() => Promise.resolve([]))))(
				req,
				res as unknown as Response,
				nextMock
			);

			const viewData = res.render.mock.calls[0].arguments[1] as RenderLocals;
			assert.strictEqual(viewData.backLinkUrl, '/cases/personal-list');
		});
	});

	describe('buildFindSelectedUser', () => {
		it('should redirect back to personal list if no userId is submitted', async () => {
			const req = buildMockReq({ body: {} });
			const res = buildMockRes();

			await buildFindSelectedUser(buildService(mock.fn(() => Promise.resolve([]))))(
				req,
				res as unknown as Response,
				nextMock
			);

			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/personal-list');
		});

		it('should redirect back to personal list if an invalid userId is submitted', async () => {
			const req = buildMockReq({ body: { userId: 'not-in-entra' } });
			const res = buildMockRes();

			await buildFindSelectedUser(buildService(mock.fn(() => Promise.resolve([]))))(
				req,
				res as unknown as Response,
				nextMock
			);

			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/personal-list');
		});

		it('should redirect to the target user list if a valid userId is submitted', async () => {
			const req = buildMockReq({ body: { userId: 'user-2' } });
			const res = buildMockRes();

			await buildFindSelectedUser(buildService(mock.fn(() => Promise.resolve([]))))(
				req,
				res as unknown as Response,
				nextMock
			);

			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/personal-list?userId=user-2');
		});
	});
});
