import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildViewCaseHistory } from './controller.ts';

describe('buildViewCaseHistory', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockDb = {
		case: { findUnique: mock.fn() }
	} as any;

	const mockAudit = {
		getAllForCase: mock.fn(),
		countForCase: mock.fn()
	} as any;

	const mockRes = () => {
		const res = {
			render: mock.fn(),
			locals: {}
		} as any;
		res.status = mock.fn(() => res);
		return res;
	};

	const mockReq = (overrides = {}) =>
		({
			params: { id: 'case-123' },
			query: {},
			session: {},
			originalUrl: '/cases/case-123/case-history',
			...overrides
		}) as any;

	const buildService = (overrides = {}) => ({
		db: mockDb,
		audit: mockAudit,
		logger: mockLogger,
		getEntraClient: () => ({
			listAllGroupMembers: async () => [
				{ id: 'user-1', displayName: 'Jane Smith' },
				{ id: 'user-2', displayName: 'John Doe' }
			]
		}),
		authConfig: { groups: { applicationAccess: 'group-1' } },
		...overrides
	});

	beforeEach(() => {
		mockDb.case.findUnique.mock.resetCalls();
		mockAudit.getAllForCase.mock.resetCalls();
		mockAudit.countForCase.mock.resetCalls();
		mockLogger.error.mock.resetCalls();
	});

	describe('Validation', () => {
		it('should throw error if "id" param is missing', async () => {
			const req = mockReq({ params: {} });
			const res = mockRes();

			await assert.rejects(() => buildViewCaseHistory(buildService() as any)(req, res), {
				message: 'id param required'
			});
		});
	});

	describe('Happy Path', () => {
		it('should fetch case, audit events, and render the view', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() =>
				Promise.resolve({ name: 'Test Case', reference: 'REF-001' })
			);

			const mockEvents = [
				{
					id: 'evt-1',
					action: 'CASE_CREATED',
					userId: 'user-1',
					createdAt: '2026-02-11T14:31:00Z',
					metadata: { reference: 'REF-001' }
				},
				{
					id: 'evt-2',
					action: 'FILE_UPLOADED',
					userId: 'user-2',
					createdAt: '2026-02-10T09:15:00Z',
					metadata: null
				}
			];

			mockAudit.getAllForCase.mock.mockImplementation(() => Promise.resolve(mockEvents));
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(2));

			await buildViewCaseHistory(buildService() as any)(req, res);

			assert.strictEqual(mockDb.case.findUnique.mock.callCount(), 1);

			const dbArgs = mockDb.case.findUnique.mock.calls[0].arguments[0];
			assert.deepStrictEqual(dbArgs.where, { id: 'case-123' });
			assert.ok(dbArgs.select.name);
			assert.ok(dbArgs.select.reference);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const [viewPath, viewData] = res.render.mock.calls[0].arguments;

			assert.strictEqual(viewPath, 'views/cases/case-history/view.njk');
			assert.strictEqual(viewData.pageHeading, 'Case history');
			assert.strictEqual(viewData.reference, 'REF-001');
			assert.strictEqual(viewData.backLinkUrl, '/cases/case-123');
			assert.strictEqual(viewData.backLinkText, 'Back to case details');

			assert.strictEqual(viewData.rows.length, 2);
			assert.strictEqual(viewData.pagination.currentPage, 0);
			assert.strictEqual(viewData.pagination.totalPages, 1);
			assert.strictEqual(viewData.pagination.totalCount, 2);
		});

		it('should resolve user display names from entra group members', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() =>
				Promise.resolve({ name: 'Test Case', reference: 'REF-001' })
			);

			mockAudit.getAllForCase.mock.mockImplementation(() =>
				Promise.resolve([
					{
						id: 'evt-1',
						action: 'CASE_CREATED',
						userId: 'user-1',
						createdAt: '2026-02-11T14:31:00Z',
						metadata: { reference: 'REF-001' }
					}
				])
			);
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(1));

			await buildViewCaseHistory(buildService() as any)(req, res);

			const viewData = res.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.rows[0].user, 'Jane Smith');
		});

		it('should fall back to "Unknown User" when userId is not in entra group', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() =>
				Promise.resolve({ name: 'Test Case', reference: 'REF-001' })
			);

			mockAudit.getAllForCase.mock.mockImplementation(() =>
				Promise.resolve([
					{
						id: 'evt-1',
						action: 'CASE_CREATED',
						userId: 'unknown-user-id',
						createdAt: '2026-02-11T14:31:00Z',
						metadata: { reference: 'REF-001' }
					}
				])
			);
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(1));

			await buildViewCaseHistory(buildService() as any)(req, res);

			const viewData = res.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.rows[0].user, 'Unknown User');
		});

		it('should pass correct skip and take for page 0', async () => {
			const req = mockReq({ query: {} });
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() =>
				Promise.resolve({ name: 'Test Case', reference: 'REF-001' })
			);
			mockAudit.getAllForCase.mock.mockImplementation(() => Promise.resolve([]));
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(0));

			await buildViewCaseHistory(buildService() as any)(req, res);

			const auditArgs = mockAudit.getAllForCase.mock.calls[0].arguments;
			assert.strictEqual(auditArgs[0], 'case-123');
			assert.deepStrictEqual(auditArgs[1], { skip: 0, take: 50 });
		});

		it('should pass correct skip and take for page 2', async () => {
			const req = mockReq({ query: { page: '2' } });
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() =>
				Promise.resolve({ name: 'Test Case', reference: 'REF-001' })
			);
			mockAudit.getAllForCase.mock.mockImplementation(() => Promise.resolve([]));
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(150));

			await buildViewCaseHistory(buildService() as any)(req, res);

			const auditArgs = mockAudit.getAllForCase.mock.calls[0].arguments;
			assert.deepStrictEqual(auditArgs[1], { skip: 100, take: 50 });

			const viewData = res.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.pagination.currentPage, 2);
			assert.strictEqual(viewData.pagination.totalPages, 3);
		});

		it('should clamp negative page values to 0', async () => {
			const req = mockReq({ query: { page: '-5' } });
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() =>
				Promise.resolve({ name: 'Test Case', reference: 'REF-001' })
			);
			mockAudit.getAllForCase.mock.mockImplementation(() => Promise.resolve([]));
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(0));

			await buildViewCaseHistory(buildService() as any)(req, res);

			const auditArgs = mockAudit.getAllForCase.mock.calls[0].arguments;
			assert.deepStrictEqual(auditArgs[1], { skip: 0, take: 50 });
		});

		it('should calculate totalPages correctly', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() =>
				Promise.resolve({ name: 'Test Case', reference: 'REF-001' })
			);
			mockAudit.getAllForCase.mock.mockImplementation(() => Promise.resolve([]));
			mockAudit.countForCase.mock.mockImplementation(() => Promise.resolve(125));

			await buildViewCaseHistory(buildService() as any)(req, res);

			const viewData = res.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.pagination.totalPages, 3);
		});
	});

	describe('Error Handling', () => {
		it('should call notFoundHandler when case is not found', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			await buildViewCaseHistory(buildService() as any)(req, res);

			const historyCalls = res.render.mock.calls.filter(
				(call: any) => call.arguments[0] === 'views/cases/case-history/view.njk'
			);
			assert.strictEqual(historyCalls.length, 0);
		});

		it('should propagate DB errors via wrapPrismaError', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() => Promise.reject(new Error('Connection refused')));

			await assert.rejects(() => buildViewCaseHistory(buildService() as any)(req, res), {
				message: 'Connection refused'
			});
		});

		it('should not render if case lookup fails', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() => Promise.reject(new Error('DB timeout')));

			await assert.rejects(() => buildViewCaseHistory(buildService() as any)(req, res));

			assert.strictEqual(res.render.mock.callCount(), 0);
		});
	});
});
