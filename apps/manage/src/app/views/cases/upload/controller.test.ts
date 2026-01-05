import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildUploadToFolderView } from './controller.ts';

describe('buildUploadToFolderView', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockDb = {
		case: { findUnique: mock.fn() },
		folder: { findUnique: mock.fn() },
		draftDocument: { findMany: mock.fn() }
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
			params: { id: 'case-123', folderId: 'folder-456' },
			sessionID: 'session-abc',
			baseUrl: '/cases/case-123/upload',
			originalUrl: '/cases/case-123/upload/folder-456',
			session: {},
			...overrides
		}) as any;

	const service = { db: mockDb, logger: mockLogger };

	beforeEach(() => {
		mockDb.case.findUnique.mock.resetCalls();
		mockDb.folder.findUnique.mock.resetCalls();
		mockDb.draftDocument.findMany.mock.resetCalls();
		mockLogger.error.mock.resetCalls();
	});

	describe('Validation', () => {
		it('should throw error if "id" param is missing', async () => {
			const req = mockReq({ params: { folderId: 'folder-456' } });
			const res = mockRes();

			await assert.rejects(() => buildUploadToFolderView(service as any)(req, res), { message: 'id param required' });
		});

		it('should throw error if "folderId" param is missing', async () => {
			const req = mockReq({ params: { id: 'case-123' } });
			const res = mockRes();

			await assert.rejects(() => buildUploadToFolderView(service as any)(req, res), { message: 'id param required' });
		});
	});

	describe('Happy Path', () => {
		it('should fetch data and render the view', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					displayName: 'Evidence Folder',
					Case: { name: 'Test Case', reference: 'REF-001' },
					DraftDocuments: [{ id: 'doc-1', fileName: 'test.pdf', size: BigInt(1024) }]
				})
			);

			await buildUploadToFolderView(service as any)(req, res);

			assert.strictEqual(res.render.mock.callCount(), 1);

			const [viewPath, viewData] = res.render.mock.calls[0].arguments;
			assert.strictEqual(viewPath, 'views/cases/upload/view.njk');
			assert.strictEqual(viewData.pageHeading, 'Test Case');
			assert.strictEqual(viewData.uploadedFiles.length, 1);
			assert.ok(viewData.uploadedFiles[0]);
		});
	});

	describe('Error Handling & Not Found', () => {
		it('should trigger Not Found logic if Case or Folder is missing', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					Case: null,
					DraftDocuments: []
				})
			);

			await buildUploadToFolderView(service as any)(req, res);

			assert.strictEqual(res.render.mock.callCount(), 1);

			const renderedView = res.render.mock.calls[0].arguments[0];
			assert.notStrictEqual(renderedView, 'views/cases/upload/view.njk');
		});

		it('should propagate generic DB errors without logging internally', async () => {
			const req = mockReq();
			const res = mockRes();
			const dbError = new Error('Connection lost');

			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.reject(dbError));

			await assert.rejects(() => buildUploadToFolderView(service as any)(req, res), dbError);

			assert.strictEqual(mockLogger.error.mock.callCount(), 0);
		});
	});
});
