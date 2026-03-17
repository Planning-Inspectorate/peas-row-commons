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
			findMany: mock.fn(),
			updateMany: mock.fn()
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
			params: { id: 'case-1' },
			body: { selectedFiles: ['doc-123'] },
			baseUrl: '/cases/case-1/folders/folder-1/documents',
			originalUrl: '/cases/case-1/folders/folder-1/documents/delete-confirmation',
			session: { account: { localAccountId: 'user-1' } },
			...overrides
		}) as any;

	const service = {
		db: mockDb,
		logger: mockLogger,
		audit: {
			record: () => Promise.resolve()
		}
	};

	beforeEach(() => {
		mockDb.document.findMany.mock.resetCalls();
		mockDb.document.updateMany.mock.resetCalls();
		mockLogger.error.mock.resetCalls();
	});

	describe('buildDeleteFileView', () => {
		describe('Validation', () => {
			it('should add session error and redirect back to baseUrl if no files are selected', async () => {
				const req = mockReq({ body: {} });
				const res = mockRes();

				await buildDeleteFileView(service as any)(req, res);

				assert.strictEqual(res.redirect.mock.callCount(), 1);
				assert.strictEqual(res.redirect.mock.calls[0].arguments[0], req.baseUrl);
			});
		});

		describe('Happy Path', () => {
			const validDocuments = [
				{
					id: 'doc-123',
					fileName: 'test.pdf',
					caseId: 'case-1',
					deletedAt: null,
					Folder: { id: 'folder-1', displayName: 'Evidence' }
				}
			];

			it('should render confirmation view with fetched documents', async () => {
				const req = mockReq();
				const res = mockRes();

				mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve(validDocuments));

				await buildDeleteFileView(service as any)(req, res);

				assert.strictEqual(mockDb.document.findMany.mock.callCount(), 1);
				assert.strictEqual(res.render.mock.callCount(), 1);

				const [viewPath, viewData] = res.render.mock.calls[0].arguments;
				assert.strictEqual(viewPath, 'views/cases/case-folders/case-folder/delete-file/confirmation.njk');
				assert.strictEqual(viewData.pageHeading, 'Delete file(s)');
				assert.deepStrictEqual(viewData.documents, validDocuments);
				assert.strictEqual(viewData.backLinkUrl, '/cases/case-1/folders/folder-1');
			});
		});

		describe('Error Handling', () => {
			it('should throw error if DB returns empty array (no documents found)', async () => {
				const req = mockReq();
				const res = mockRes();

				mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve([]));

				await assert.rejects(() => buildDeleteFileView(service as any)(req, res), {
					message: 'No documents found for provided ids'
				});
			});
		});
	});

	describe('buildDeleteFileController', () => {
		describe('Validation', () => {
			it('should throw error if "id" param is missing', async () => {
				const req = mockReq({ params: {} });
				const res = mockRes();

				await assert.rejects(() => buildDeleteFileController(service as any)(req, res), {
					message: 'id param required'
				});
			});

			it('should throw error if document IDs are missing from body', async () => {
				const req = mockReq({ body: {} });
				const res = mockRes();

				await assert.rejects(() => buildDeleteFileController(service as any)(req, res), {
					message: 'documentIds body param required'
				});
			});
		});

		describe('Happy Path', () => {
			it('should soft delete documents, and redirect to folder URL', async () => {
				const req = mockReq({
					originalUrl: '/cases/case-1/folders/folder-1/documents/delete'
				});
				const res = mockRes();

				mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve([{ id: 1 }]));
				mockDb.document.updateMany.mock.mockImplementation(() => Promise.resolve({}));

				await buildDeleteFileController(service as any)(req, res);

				assert.strictEqual(mockDb.document.updateMany.mock.callCount(), 1);

				const updateArgs = mockDb.document.updateMany.mock.calls[0].arguments[0];
				assert.deepStrictEqual(updateArgs.where.id.in, ['doc-123']);
				assert.ok(updateArgs.data.deletedAt instanceof Date);

				assert.strictEqual(res.redirect.mock.callCount(), 1);
				assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/case-1/folders/folder-1');
			});
		});

		describe('Error Handling', () => {
			const validDocuments = [
				{
					id: 'doc-123',
					fileName: 'test.pdf',
					caseId: 'case-1',
					Folder: { id: 'folder-1', displayName: 'Evidence' }
				}
			];

			it('should catch update error, log it, re-fetch docs, and render error view', async () => {
				const req = mockReq({
					originalUrl: '/cases/case-1/folders/folder-1/documents/delete-confirmation'
				});
				const res = mockRes();
				const updateError = new Error('Update failed');

				mockDb.document.updateMany.mock.mockImplementation(() => Promise.reject(updateError));
				mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve(validDocuments));

				await buildDeleteFileController(service as any)(req, res);

				assert.strictEqual(mockLogger.error.mock.callCount(), 1);
				assert.strictEqual(mockLogger.error.mock.calls[0].arguments[0].error, updateError);

				assert.strictEqual(mockDb.document.findMany.mock.callCount(), 1);

				assert.strictEqual(res.render.mock.callCount(), 1);
				const [viewPath, viewData] = res.render.mock.calls[0].arguments;

				assert.strictEqual(viewPath, 'views/cases/case-folders/case-folder/delete-file/confirmation.njk');
				assert.deepStrictEqual(viewData.documents, validDocuments);
				assert.strictEqual(viewData.backLinkUrl, '/cases/case-1/folders/folder-1');

				assert.strictEqual(res.locals.errorSummary.length, 1);
				assert.strictEqual(res.locals.errorSummary[0].text, 'Failed to delete documents, please try again.');
			});
		});
	});
});
