import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildViewCaseFolders } from './controller.ts';

describe('buildViewCaseFolders', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockDb = {
		case: { findUnique: mock.fn() },
		folder: { findMany: mock.fn() }
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
			originalUrl: '/cases/case-123/folders',
			...overrides
		}) as any;

	const service = { db: mockDb, logger: mockLogger };

	beforeEach(() => {
		mockDb.case.findUnique.mock.resetCalls();
		mockDb.folder.findMany.mock.resetCalls();
		mockLogger.error.mock.resetCalls();
	});

	describe('Validation', () => {
		it('should throw error if "id" param is missing', async () => {
			const req = mockReq({ params: {} });
			const res = mockRes();

			await assert.rejects(() => buildViewCaseFolders(service as any)(req, res), { message: 'id param required' });
		});
	});

	describe('Happy Path', () => {
		it('should fetch data and render the view', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() =>
				Promise.resolve({ name: 'Test Case', reference: 'REF-001' })
			);
			mockDb.folder.findMany.mock.mockImplementation(() =>
				Promise.resolve([
					{ id: 'folder-1', displayName: 'Folder One' },
					{ id: 'folder-2', displayName: 'Folder Two' }
				])
			);

			await buildViewCaseFolders(service as any)(req, res);

			assert.strictEqual(mockDb.case.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.case.findUnique.mock.calls[0].arguments[0], {
				select: { name: true, reference: true },
				where: { id: 'case-123' }
			});

			assert.strictEqual(mockDb.folder.findMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.folder.findMany.mock.calls[0].arguments[0], {
				where: { caseId: 'case-123', parentFolderId: null }
			});

			assert.strictEqual(res.render.mock.callCount(), 1);

			const [viewPath, viewData] = res.render.mock.calls[0].arguments;
			assert.strictEqual(viewPath, 'views/cases/case-folders/view.njk');
			assert.strictEqual(viewData.pageHeading, 'Test Case');
			assert.strictEqual(viewData.reference, 'REF-001');
			assert.strictEqual(viewData.folders.length, 2);
			assert.strictEqual(viewData.backLinkUrl, '/cases/case-123');
		});
	});

	describe('Error Handling', () => {
		it('should trigger Not Found logic if Case or Folders are missing', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.case.findUnique.mock.mockImplementation(() => Promise.resolve(null));
			mockDb.folder.findMany.mock.mockImplementation(() => Promise.resolve([]));

			await buildViewCaseFolders(service as any)(req, res);

			assert.strictEqual(res.render.mock.callCount(), 1);

			const renderedView = res.render.mock.calls[0].arguments[0];
			assert.notStrictEqual(renderedView, 'views/cases/case-folders/view.njk');
		});

		it('should propagate generic DB errors', async () => {
			const req = mockReq();
			const res = mockRes();
			const dbError = new Error('Connection lost');

			mockDb.case.findUnique.mock.mockImplementation(() => Promise.reject(dbError));
			mockDb.folder.findMany.mock.mockImplementation(() => Promise.resolve([]));

			await assert.rejects(() => buildViewCaseFolders(service as any)(req, res), dbError);

			assert.strictEqual(mockLogger.error.mock.callCount(), 0);
		});
	});
});
