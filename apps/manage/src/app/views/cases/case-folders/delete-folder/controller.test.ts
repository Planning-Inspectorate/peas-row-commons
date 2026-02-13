import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { getRedirectUrl, buildDeleteFolderView, buildDeleteFolderController } from './controller.ts';

describe('Delete Folder Controller', () => {
	describe('getRedirectUrl', () => {
		it('should return the base case-folders URL if the folder has no parent', () => {
			const folder = {
				caseId: 'case-1',
				ParentFolder: null
			};

			const result = getRedirectUrl(folder);
			assert.strictEqual(result, '/cases/case-1/case-folders');
		});

		it('should return the nested URL if a parent folder exists', () => {
			const folder = {
				caseId: 'case-1',
				ParentFolder: {
					id: 'parent-99',
					displayName: 'My Parent Folder'
				}
			};

			const result = getRedirectUrl(folder);
			assert.strictEqual(result, '/cases/case-1/case-folders/parent-99/my-parent-folder');
		});
	});

	describe('buildDeleteFolderView', () => {
		it('should render the confirmation view with correct context', async () => {
			const mockDb = {
				folder: {
					findUnique: (args: any) => {
						if (args.where.id === 'folder-123') {
							return Promise.resolve({
								id: 'folder-123',
								displayName: 'Target Folder',
								caseId: 'case-1',
								ParentFolder: { id: 'parent-1', displayName: 'Parent' },
								_count: { ChildFolders: 0, Documents: 0 }
							});
						}
						return Promise.resolve(null);
					}
				}
			};

			const mockService = { db: mockDb, logger: { error: () => {} } };

			const req = { params: { folderId: 'folder-123', id: 'case-1' }, session: {} };
			const res = {
				render: mock.fn(),
				locals: {}
			};

			const handler = buildDeleteFolderView(mockService as any);
			await handler(req as any, res as any);

			assert.strictEqual(res.render.mock.callCount(), 1);

			assert.strictEqual(res.render.mock.calls[0].arguments[0], 'views/cases/case-folders/delete-folder/view.njk');

			const context = res.render.mock.calls[0].arguments[1];
			assert.strictEqual(context.pageHeading, 'Delete folder');
			assert.strictEqual(context.folders[0].displayName, 'Target Folder');
		});

		it('should throw error if folderId param is missing', async () => {
			const mockService = { db: {}, logger: {} };
			const req = { params: {} };
			const res = {};

			const handler = buildDeleteFolderView(mockService as any);

			await assert.rejects(async () => await handler(req as any, res as any), { message: 'folderId param required' });
		});
	});

	describe('buildDeleteFolderController', () => {
		it('should soft delete the folder and redirect', async () => {
			let updateCaptured: any = null;

			const mockDb = {
				folder: {
					findUnique: () =>
						Promise.resolve({
							id: 'folder-123',
							caseId: 'case-1',
							displayName: 'Folder',
							ParentFolder: null
						}),
					update: (args: any) => {
						updateCaptured = args;
						return Promise.resolve({});
					}
				}
			};

			const mockService = {
				db: mockDb,
				logger: { error: () => {} },
				audit: {
					record: () => Promise.resolve()
				}
			};

			const req = {
				params: { folderId: 'folder-123', id: 'case-1' },
				session: {}
			};
			const res = {
				redirect: mock.fn(),
				render: mock.fn(),
				locals: {}
			};

			const handler = buildDeleteFolderController(mockService as any);
			await handler(req as any, res as any);

			assert.strictEqual(updateCaptured.where.id, 'folder-123');
			assert.ok(updateCaptured.data.deletedAt instanceof Date);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/case-1/case-folders');
		});

		it('should render view with error if database update fails', async () => {
			const mockDb = {
				folder: {
					findUnique: () =>
						Promise.resolve({
							id: 'folder-123',
							caseId: 'case-1',
							displayName: 'Folder',
							ParentFolder: null
						}),
					update: () => Promise.reject(new Error('DB Error'))
				}
			};

			const mockLogger = {
				error: mock.fn()
			};

			const mockService = {
				db: mockDb,
				logger: mockLogger,
				audit: {
					record: () => Promise.resolve()
				}
			};

			const req = { params: { folderId: 'folder-123', id: 'case-1' } };
			const res = {
				render: mock.fn(),
				redirect: mock.fn(),
				locals: {}
			} as any;

			const handler = buildDeleteFolderController(mockService as any);
			await handler(req as any, res as any);

			assert.strictEqual(mockLogger.error.mock.callCount(), 1);

			assert.strictEqual(res.render.mock.callCount(), 1);
			assert.strictEqual(res.locals.errorSummary[0].text, 'Failed to delete folder, please try again.');
		});
	});

	describe('buildDeleteFolderController (audit recording)', () => {
		it('should record audit event when folder is deleted', async () => {
			let recordedAudit: any = null;

			const mockService = {
				db: {
					folder: {
						findUnique: () =>
							Promise.resolve({
								id: 'folder-123',
								displayName: 'Target Folder',
								caseId: 'case-1',
								ParentFolder: null
							}),
						update: () => Promise.resolve({})
					}
				},
				audit: {
					record: (entry: any) => {
						recordedAudit = entry;
						return Promise.resolve();
					}
				},
				logger: {
					error: () => {},
					info: () => {}
				}
			};

			const req = {
				params: { id: 'case-1', folderId: 'folder-123' },
				session: { account: { localAccountId: 'user-456' } }
			};

			const res = {
				redirect: () => {},
				render: () => {},
				locals: {}
			};

			const handler = buildDeleteFolderController(mockService as any);
			await handler(req as any, res as any);

			assert.strictEqual(recordedAudit.caseId, 'case-1');
			assert.strictEqual(recordedAudit.action, 'FOLDER_DELETED');
			assert.strictEqual(recordedAudit.userId, 'user-456');
			assert.deepStrictEqual(recordedAudit.metadata, { folderName: 'Target Folder' });
		});
	});
});
