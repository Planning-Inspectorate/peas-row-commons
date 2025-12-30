import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeleteFileView, buildDeleteFileController } from './controller.ts';

describe('Delete File Controllers', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockDb = {
		document: {
			findUnique: mock.fn(),
			update: mock.fn()
		}
	} as any;

	const mockRes = () => {
		const res = {
			render: mock.fn(),
			redirect: mock.fn(),
			locals: {}
		} as any;
		res.status = mock.fn(() => res);
		return res;
	};

	const mockReq = (overrides = {}) =>
		({
			params: { documentId: 'doc-123' },
			originalUrl: '/cases/1/folders/2/documents/doc-123/delete',
			...overrides
		}) as any;

	const service = { db: mockDb, logger: mockLogger };

	beforeEach(() => {
		mockDb.document.findUnique.mock.resetCalls();
		mockDb.document.update.mock.resetCalls();
		mockLogger.error.mock.resetCalls();
	});

	describe('buildDeleteFileView', () => {
		describe('Validation', () => {
			it('should throw error if "documentId" param is missing', async () => {
				const req = mockReq({ params: {} });
				const res = mockRes();

				await assert.rejects(() => buildDeleteFileView(service as any)(req, res), {
					message: 'documentId param required'
				});
			});
		});

		describe('Happy Path', () => {
			const validDocument = {
				id: 'doc-123',
				fileName: 'test.pdf',
				caseId: 'case-1',
				deletedAt: null,
				Folder: { id: 'folder-1', displayName: 'Evidence' }
			};

			it('should render confirmation view if document is active', async () => {
				const req = mockReq();
				const res = mockRes();

				mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve(validDocument));

				await buildDeleteFileView(service as any)(req, res);

				assert.strictEqual(mockDb.document.findUnique.mock.callCount(), 1);
				assert.strictEqual(res.render.mock.callCount(), 1);

				const [viewPath, viewData] = res.render.mock.calls[0].arguments;
				assert.strictEqual(viewPath, 'views/cases/case-folders/case-folder/delete-file/confirmation.njk');
				assert.strictEqual(viewData.pageHeading, 'Delete file');
				assert.deepStrictEqual(viewData.documents, [validDocument]);

				assert.strictEqual(viewData.backLinkUrl, '/cases/case-1/case-folders/folder-1/Evidence');
			});

			it('should render success view immediately if document is already deleted', async () => {
				const req = mockReq();
				const res = mockRes();

				const deletedDocument = { ...validDocument, deletedAt: new Date() };
				mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve(deletedDocument));

				await buildDeleteFileView(service as any)(req, res);

				assert.strictEqual(res.render.mock.callCount(), 1);

				const [viewPath, viewData] = res.render.mock.calls[0].arguments;
				assert.strictEqual(viewPath, 'views/cases/case-folders/case-folder/delete-file/success.njk');
				assert.strictEqual(viewData.pageHeading, 'You have deleted the file');
				assert.strictEqual(viewData.folderUrl, '/cases/case-1/case-folders/folder-1/Evidence');
			});
		});

		describe('Error Handling', () => {
			it('should throw "No document found" if DB returns null', async () => {
				const req = mockReq();
				const res = mockRes();

				mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve(null));

				await assert.rejects(() => buildDeleteFileView(service as any)(req, res), {
					message: 'No document found for id: doc-123'
				});
			});

			it('should propagate generic DB errors', async () => {
				const req = mockReq();
				const res = mockRes();
				const dbError = new Error('Connection failed');

				mockDb.document.findUnique.mock.mockImplementation(() => Promise.reject(dbError));

				await assert.rejects(() => buildDeleteFileView(service as any)(req, res), dbError);
			});
		});
	});

	describe('buildDeleteFileController', () => {
		describe('Validation', () => {
			it('should throw error if "documentId" param is missing', async () => {
				const req = mockReq({ params: {} });
				const res = mockRes();

				await assert.rejects(() => buildDeleteFileController(service as any)(req, res), {
					message: 'documentId param required'
				});
			});
		});

		describe('Happy Path', () => {
			it('should soft delete document and redirect to original URL', async () => {
				const req = mockReq();
				const res = mockRes();

				mockDb.document.update.mock.mockImplementation(() => Promise.resolve({}));

				await buildDeleteFileController(service as any)(req, res);

				assert.strictEqual(mockDb.document.update.mock.callCount(), 1);

				const updateArgs = mockDb.document.update.mock.calls[0].arguments[0];
				assert.strictEqual(updateArgs.where.id, 'doc-123');
				assert.ok(updateArgs.data.deletedAt instanceof Date);

				assert.strictEqual(res.redirect.mock.callCount(), 1);
				assert.strictEqual(res.redirect.mock.calls[0].arguments[0], req.originalUrl);
			});
		});

		describe('Error Handling', () => {
			const validDocument = {
				id: 'doc-123',
				fileName: 'test.pdf',
				caseId: 'case-1',
				Folder: { id: 'folder-1', displayName: 'Evidence' }
			};

			it('should catch update error, log it, re-fetch doc, and render error view', async () => {
				const req = mockReq();
				const res = mockRes();
				const updateError = new Error('Update failed');

				mockDb.document.update.mock.mockImplementation(() => Promise.reject(updateError));

				mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve(validDocument));

				await buildDeleteFileController(service as any)(req, res);

				assert.strictEqual(mockLogger.error.mock.callCount(), 1);
				assert.strictEqual(mockLogger.error.mock.calls[0].arguments[0].error, updateError);

				assert.strictEqual(mockDb.document.findUnique.mock.callCount(), 1);

				assert.strictEqual(res.render.mock.callCount(), 1);
				const [viewPath, viewData] = res.render.mock.calls[0].arguments;

				assert.strictEqual(viewPath, 'views/cases/case-folders/case-folder/delete-file/confirmation.njk');
				assert.deepStrictEqual(viewData.documents, [validDocument]);
				assert.strictEqual(viewData.backLinkUrl, '/cases/case-1/case-folders/folder-1/Evidence');

				assert.strictEqual(res.locals.errorSummary.length, 1);
				assert.strictEqual(res.locals.errorSummary[0].text, 'Failed to delete document, please try again.');
			});

			it('should handle failure when re-fetching document details after update error', async () => {
				const req = mockReq();
				const res = mockRes();

				mockDb.document.update.mock.mockImplementation(() => Promise.reject(new Error('Update failed')));

				const fetchError = new Error('Fetch failed');
				mockDb.document.findUnique.mock.mockImplementation(() => Promise.reject(fetchError));

				await buildDeleteFileController(service as any)(req, res);

				assert.strictEqual(mockLogger.error.mock.callCount(), 2);
				assert.strictEqual(mockLogger.error.mock.calls[1].arguments[0].fetchError, fetchError);

				const viewData = res.render.mock.calls[0].arguments[1];
				assert.deepStrictEqual(viewData.documents, []);
				assert.strictEqual(viewData.backLinkUrl, '/');
			});
		});
	});
});
