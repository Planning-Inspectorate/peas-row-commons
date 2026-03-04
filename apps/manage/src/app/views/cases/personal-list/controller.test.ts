import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { buildViewPersonalList } from './controller.ts';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '#service';

type MockRes = Omit<Response, 'render' | 'status'> & {
	render: ReturnType<typeof mock.fn>;
	status: ReturnType<typeof mock.fn>;
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
	pageHeading: string;
	currentPage: string;
	statusParams: { currentStatus?: string; caseStatuses?: unknown[] };
	cases: Array<{ caseOfficerName?: string }>;
};

const buildMockRes = (): MockRes => {
	const resObj = { locals: {} } as MockRes;

	resObj.render = mock.fn((view: string, locals: unknown) => {});
	resObj.status = mock.fn((code: number) => resObj);

	return resObj;
};

const buildMockReq = (overrides: Record<string, unknown> = {}): Request =>
	({
		query: {},
		session: { account: { localAccountId: 'user-123' } },
		...overrides
	}) as unknown as Request;

const buildService = (findManyMock: ReturnType<typeof mock.fn>): ManageService =>
	({
		db: { case: { findMany: findManyMock } } as unknown as ManageService['db'],
		logger: {
			info: mock.fn((msg: string) => {}),
			error: mock.fn((msg: string) => {}),
			warn: mock.fn((msg: string) => {})
		} as unknown as ManageService['logger'],
		getEntraClient: () => ({
			listAllGroupMembers: async () => [
				{ id: 'user-123', displayName: 'Jane Smith' },
				{ id: 'user-2', displayName: 'John Doe' }
			]
		}),
		authConfig: { groups: { applicationAccess: 'group-1' } }
	}) as unknown as ManageService;

const nextMock = mock.fn((err?: unknown) => {}) as unknown as NextFunction;

describe('buildViewPersonalList', () => {
	describe('Validation', () => {
		it('should throw error if userId is missing from session', async () => {
			const req = buildMockReq({ session: { account: null } });
			const res = buildMockRes();

			const findManyMock = mock.fn((query: unknown) => Promise.resolve([]));

			await assert.rejects(
				() => buildViewPersonalList(buildService(findManyMock))(req, res as unknown as Response, nextMock),
				{
					message: 'Cannot get personal cases without a userId'
				}
			);
		});
	});

	describe('Happy Path', () => {
		it('should fetch cases without status filter and render the view', async () => {
			const req = buildMockReq();
			const res = buildMockRes();

			const findManyMock = mock.fn((query: unknown) =>
				Promise.resolve([
					{ id: 'case-1', reference: 'REF-001', CaseOfficer: { idpUserId: 'user-123' }, Inspectors: [] }
				])
			);

			await buildViewPersonalList(buildService(findManyMock))(req, res as unknown as Response, nextMock);

			assert.strictEqual(findManyMock.mock.callCount(), 1);

			const dbArgs = findManyMock.mock.calls[0].arguments[0] as FindManyArgs;
			assert.strictEqual(dbArgs.where.Status, undefined);
			assert.deepStrictEqual(dbArgs.where.OR, [
				{ CaseOfficer: { idpUserId: 'user-123' } },
				{ Inspectors: { some: { Inspector: { idpUserId: 'user-123' } } } }
			]);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const [viewPath, viewData] = res.render.mock.calls[0].arguments as [string, RenderLocals];

			assert.strictEqual(viewPath, 'views/cases/personal-list/view.njk');
			assert.strictEqual(viewData.pageHeading, 'Cases assigned to you');
			assert.strictEqual(viewData.statusParams.currentStatus, undefined);
			assert.strictEqual(viewData.cases[0].caseOfficerName, 'Jane Smith');
		});

		it('should append status to the where clause if a specific status is provided', async () => {
			const req = buildMockReq({ query: { status: 'new-case' } });
			const res = buildMockRes();

			const findManyMock = mock.fn((query: unknown) => Promise.resolve([]));

			await buildViewPersonalList(buildService(findManyMock))(req, res as unknown as Response, nextMock);

			const dbArgs = findManyMock.mock.calls[0].arguments[0] as FindManyArgs;
			assert.deepStrictEqual(dbArgs.where.Status, { id: 'new-case' });

			const viewData = res.render.mock.calls[0].arguments[1] as RenderLocals;
			assert.strictEqual(viewData.statusParams.currentStatus, 'new-case');
		});

		it('should NOT append status to the where clause if status is "all"', async () => {
			const req = buildMockReq({ query: { status: 'all' } });
			const res = buildMockRes();

			const findManyMock = mock.fn((query: unknown) => Promise.resolve([]));

			await buildViewPersonalList(buildService(findManyMock))(req, res as unknown as Response, nextMock);

			const dbArgs = findManyMock.mock.calls[0].arguments[0] as FindManyArgs;
			assert.strictEqual(dbArgs.where.Status, undefined);
		});
	});

	describe('Error Handling', () => {
		it('should propagate DB errors', async () => {
			const req = buildMockReq();
			const res = buildMockRes();

			const findManyMock = mock.fn((query: unknown) => Promise.reject(new Error('Connection refused')));

			await assert.rejects(
				() => buildViewPersonalList(buildService(findManyMock))(req, res as unknown as Response, nextMock),
				{
					message: 'Connection refused'
				}
			);

			assert.strictEqual(res.render.mock.callCount(), 0);
		});
	});
});
