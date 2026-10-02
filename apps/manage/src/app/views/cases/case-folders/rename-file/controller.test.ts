import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import {
	buildRenameFile,
	buildRenameFileView,
	getErroredFileName,
	getSessionErrors,
	renameFileRecord
} from './controller.ts';

describe('Rename File Controller', () => {
	let mockReq: any;
	let mockRes: any;
	let mockNext: any;
	let mockDb: any;
	let mockService: any;

	beforeEach(() => {
		mockReq = {
			baseUrl: '/cases/123/case-folders/456/789/rename-file',
			params: { id: 'case-123', folderId: 'folder-456', fileId: 'file-789' },
			body: {},
			session: { files: {} }
		};

		mockRes = {
			render: mock.fn(),
			redirect: mock.fn(),
			status: mock.fn(function (this: any) {
				return this;
			}),
			send: mock.fn()
		};

		mockNext = mock.fn();

		mockDb = {
			document: {
				findUnique: mock.fn(),
				update: mock.fn()
			}
		};

		mockService = {
			db: mockDb,
			logger: { error: mock.fn() },
			audit: {
				record: mock.fn(() => Promise.resolve())
			}
		};
	});

	describe('buildRenameFileView', () => {
		it('should render the view if data is valid', async () => {
			mockDb.document.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					fileName: 'Current-Name.jpg'
				})
			);

			const handler = buildRenameFileView(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const [view, data] = mockRes.render.mock.calls[0].arguments;
			assert.strictEqual(view, 'views/cases/case-folders/rename-file/view.njk');
			assert.strictEqual(data.currentFileName, 'Current-Name');
			assert.strictEqual(data.fileExtension, '.jpg');
		});

		it('should render 404 if file not found', async () => {
			mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			const handler = buildRenameFileView(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
	});

	describe('buildRenameFile', () => {
		it('should rename and redirect on success', async () => {
			mockReq.body.fileName = 'New-Name';
			mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve({ fileName: 'Old-Name.jpg' }));
			mockDb.document.update.mock.mockImplementation(() => Promise.resolve({}));

			const handler = buildRenameFile(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockDb.document.update.mock.callCount(), 1);
			assert.strictEqual(mockDb.document.update.mock.calls[0].arguments[0].data.fileName, 'New-Name.jpg');

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cases/123/case-folders/456');
		});

		it('should trim leading and trailing whitespace from the file name before saving', async () => {
			mockReq.body.fileName = '  New-Name  ';
			mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve({ fileName: 'Old-Name.jpg' }));
			mockDb.document.update.mock.mockImplementation(() => Promise.resolve({}));

			const handler = buildRenameFile(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockDb.document.update.mock.callCount(), 1);
			assert.strictEqual(mockDb.document.update.mock.calls[0].arguments[0].data.fileName, 'New-Name.jpg');
		});

		it('should store the renamed flag and new filename in session, keyed by folderId', async () => {
			mockReq.body.fileName = 'Proposed-Works-Diagram';
			mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve({ fileName: 'Old-Diagram.jpg' }));
			mockDb.document.update.mock.mockImplementation(() => Promise.resolve({}));

			const handler = buildRenameFile(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockReq.session.folder['folder-456'].fileRenamed, true);
			assert.strictEqual(mockReq.session.folder['folder-456'].renamedFileName, 'Proposed-Works-Diagram.jpg');
		});

		it('should throw error if fileId is missing', async () => {
			mockReq.params.fileId = undefined;
			const handler = buildRenameFile(mockService);

			await assert.rejects(async () => {
				await handler(mockReq, mockRes, mockNext);
			});
		});

		it('should throw error if DB update fails', async () => {
			mockReq.body.fileName = 'New-Name';
			mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve({ fileName: 'Old-Name.jpg' }));
			mockDb.document.update.mock.mockImplementation(() => Promise.reject(new Error('DB Error')));

			const handler = buildRenameFile(mockService);

			await assert.rejects(async () => {
				await handler(mockReq, mockRes, mockNext);
			});
		});

		it('should throw error if the existing file has no extension', async () => {
			mockReq.body.fileName = 'New-Name';
			mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve({ fileName: '' }));

			const handler = buildRenameFile(mockService);

			await assert.rejects(async () => {
				await handler(mockReq, mockRes, mockNext);
			});
		});
	});

	describe('renameFileRecord', () => {
		it('should pass correct data to prisma', async () => {
			mockDb.document.update.mock.mockImplementation(() => Promise.resolve());

			await renameFileRecord(mockDb, { name: 'Foo.jpg', fileId: '123' });

			assert.strictEqual(mockDb.document.update.mock.callCount(), 1);
			assert.strictEqual(mockDb.document.update.mock.calls[0].arguments[0].where.id, '123');
			assert.strictEqual(mockDb.document.update.mock.calls[0].arguments[0].data.fileName, 'Foo.jpg');
		});
	});

	describe('getSessionErrors', () => {
		it('should return null if no errors', () => {
			const result = getSessionErrors(mockReq, 'case-123');
			assert.strictEqual(result, null);
		});

		it('should return errors if present', () => {
			mockReq.session = { files: { 'case-123': { renameFileErrors: ['Error'] } } };
			const result = getSessionErrors(mockReq, 'case-123');
			assert.deepStrictEqual(result, ['Error']);
		});
	});

	describe('getErroredFileName', () => {
		it('should return null if no errored file name is present', () => {
			const result = getErroredFileName(mockReq, 'case-123');
			assert.strictEqual(result, null);
		});

		it('should return the errored file name if present', () => {
			mockReq.session = { files: { 'case-123': { erroredFileName: 'Bad-Name' } } };
			const result = getErroredFileName(mockReq, 'case-123');
			assert.strictEqual(result, 'Bad-Name');
		});
	});
});
