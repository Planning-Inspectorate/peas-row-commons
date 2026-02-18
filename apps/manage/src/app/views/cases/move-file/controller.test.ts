import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { buildHandleMoveSelection, buildViewMoveFiles } from './controller.ts';

describe('Move Selection Controller', () => {
	let mockReq: any;
	let mockRes: any;
	let mockService: any;
	let mockDb: any;

	beforeEach(() => {
		mockReq = {
			baseUrl: '/cases/123/folder/456/move-files',
			originalUrl: '/cases/123/folder/456/move-files',
			params: { id: 'case-123' },
			body: {},
			session: {},
			headers: {}
		};

		mockRes = {
			redirect: mock.fn(),
			render: mock.fn(),
			status: mock.fn(() => ({ send: mock.fn() }))
		};

		mockDb = {
			document: {
				findMany: mock.fn()
			}
		};

		mockService = {
			db: mockDb,
			audit: {
				record: mock.fn(() => Promise.resolve())
			}
		};
	});

	describe('buildHandleMoveSelection', () => {
		it('should redirect back if no files are selected', async () => {
			mockReq.body.selectedFiles = undefined;

			const handler = buildHandleMoveSelection();
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);

			const expectedUrl = '/cases/123/folder/456';
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], expectedUrl);
		});

		it('should save a single file ID to session and redirect', async () => {
			mockReq.body.selectedFiles = 'file-1';

			const handler = buildHandleMoveSelection();
			await handler(mockReq, mockRes, () => {});

			assert.deepStrictEqual(mockReq.session.moveFilesIds, ['file-1']);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
		});

		it('should save multiple file IDs to session and redirect', async () => {
			mockReq.body.selectedFiles = ['file-1', 'file-2'];

			const handler = buildHandleMoveSelection();
			await handler(mockReq, mockRes, () => {});

			assert.deepStrictEqual(mockReq.session.moveFilesIds, ['file-1', 'file-2']);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
		});
	});

	describe('buildViewMoveFiles', () => {
		it('should redirect back if session has no file IDs', async () => {
			mockReq.session.moveFilesIds = undefined;

			const handler = buildViewMoveFiles(mockService);
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cases/123/folder/456');
		});

		it('should redirect back if session has empty file IDs array', async () => {
			mockReq.session.moveFilesIds = [];

			const handler = buildViewMoveFiles(mockService);
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
		});

		it('should render the view with documents if files exist', async () => {
			mockReq.session.moveFilesIds = ['file-1', 'file-2'];

			const mockDocs = [
				{ id: 'file-1', fileName: 'test1.pdf' },
				{ id: 'file-2', fileName: 'test2.pdf' }
			];

			mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve(mockDocs));

			const handler = buildViewMoveFiles(mockService);
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockDb.document.findMany.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);

			const [view, data] = mockRes.render.mock.calls[0].arguments;
			assert.strictEqual(view, 'views/cases/move-file/view.njk');
			assert.strictEqual(data.pageHeading, 'Move files');
			assert.strictEqual(data.documents, mockDocs);
			assert.strictEqual(data.backLinkUrl, '/cases/123/folder/456');
		});

		it('should change page heading singular if only one file', async () => {
			mockReq.session.moveFilesIds = ['file-1'];

			const mockDocs = [{ id: 'file-1', fileName: 'test1.pdf' }];
			mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve(mockDocs));

			const handler = buildViewMoveFiles(mockService);
			await handler(mockReq, mockRes, () => {});

			const data = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(data.pageHeading, 'Move file');
		});

		it('should call notFoundHandler (implicit return) if DB returns null', async () => {
			mockReq.session.moveFilesIds = ['file-1'];

			mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve(null));

			const handler = buildViewMoveFiles(mockService);
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
		});
	});

	describe('buildViewMoveFiles (audit recording)', () => {
		it('should record audit event when viewing files to move', async () => {
			let recordedAudit: any = null;

			mockReq.session.moveFilesIds = ['file-1'];
			mockReq.session.account = { localAccountId: 'user-555' };

			const mockDocs = [{ id: 'file-1', fileName: 'test.pdf' }];
			mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve(mockDocs));

			mockService.audit = {
				record: (entry: any) => {
					recordedAudit = entry;
					return Promise.resolve();
				}
			};

			const handler = buildViewMoveFiles(mockService);
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(recordedAudit.caseId, 'case-123');
			assert.strictEqual(recordedAudit.action, 'FILE_MOVED');
			assert.strictEqual(recordedAudit.userId, 'user-555');
		});
	});
});
