import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	getSessionErrors,
	getParentFolder,
	getNextDisplayOrder,
	createFolderRecord,
	getRedirectUrl,
	buildCreateFolders
} from './controller.ts';
import { AUDIT_ACTIONS } from '../../../../audit/actions.ts';

describe('Create Folders Helpers', () => {
	describe('getParentFolder', () => {
		it('should return null if folderId is not provided', async () => {
			const db = {};
			const result = await getParentFolder(db, null, 'case-1');
			assert.strictEqual(result, null);
		});

		it('should query the database for the specific folder and case', async () => {
			const mockDb = {
				folder: {
					findUnique: (args: any) => {
						if (args.where.id === 'folder-123' && args.where.caseId === 'case-1') {
							return Promise.resolve({ displayName: 'Target Folder' });
						}
						return Promise.resolve(null);
					}
				}
			};

			const result = await getParentFolder(mockDb, 'folder-123', 'case-1');
			assert.deepStrictEqual(result, { displayName: 'Target Folder' });
		});
	});

	describe('getNextDisplayOrder', () => {
		it('should return 100 if no items exist (aggregation returns null)', async () => {
			const mockDb = {
				folder: {
					aggregate: () => Promise.resolve({ _max: { displayOrder: null } })
				}
			};

			const result = await getNextDisplayOrder(mockDb, 'parent-1');
			assert.strictEqual(result, 100);
		});

		it('should return max + 100 if items exist', async () => {
			const mockDb = {
				folder: {
					aggregate: () => Promise.resolve({ _max: { displayOrder: 250 } })
				}
			};

			const result = await getNextDisplayOrder(mockDb, 'parent-1');
			assert.strictEqual(result, 350);
		});
	});

	describe('createFolderRecord', () => {
		it('should create folder with correct parameters including isCustom flag', async () => {
			let capturedData: any;
			const mockDb = {
				folder: {
					create: (args: any) => {
						capturedData = args.data;
						return Promise.resolve({});
					}
				}
			};

			await createFolderRecord(mockDb as any, {
				name: 'New Folder',
				parentId: 'parent-123',
				caseId: 'case-999',
				order: 500
			});

			assert.strictEqual(capturedData.displayName, 'New Folder');
			assert.strictEqual(capturedData.parentFolderId, 'parent-123');
			assert.strictEqual(capturedData.caseId, 'case-999');
			assert.strictEqual(capturedData.displayOrder, 500);
			assert.strictEqual(capturedData.isCustom, true);
		});
	});

	describe('getRedirectUrl', () => {
		it('should return the base case-folders URL if no parent folder is involved', () => {
			const result = getRedirectUrl('case-1', null, null);
			assert.strictEqual(result, '/cases/case-1/case-folders');
		});

		it('should return a nested URL with kebab-case slug if parent exists', () => {
			const parent = { displayName: 'My New Folder' };
			const result = getRedirectUrl('case-1', parent, 'folder-2');

			assert.strictEqual(result, '/cases/case-1/case-folders/folder-2/my-new-folder');
		});

		it('should handle parent folder names with special characters in URL generation', () => {
			const parent = { displayName: 'Folder & Documents' };
			const result = getRedirectUrl('case-1', parent, 'folder-3');

			assert.strictEqual(result, '/cases/case-1/case-folders/folder-3/folder-documents');
		});
	});

	describe('getSessionErrors', () => {
		it('should return null if no errors are present', () => {
			const req = { session: {} };
			const result = getSessionErrors(req as any, 'case-1');
			assert.strictEqual(result, null);
		});
	});

	describe('buildCreateFolders (audit recording)', () => {
		it('should record audit event when folder is created', async () => {
			let recordedAudit: any = null;

			const mockService = {
				db: {
					folder: {
						findUnique: () => Promise.resolve(null),
						aggregate: () => Promise.resolve({ _max: { displayOrder: 0 } }),
						create: () => Promise.resolve({ id: 'new-folder-id' })
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
				params: { id: 'case-1', folderId: null },
				body: { folderName: 'Test Folder' },
				session: { account: { localAccountId: 'user-123' } }
			};

			const res = {
				redirect: () => {}
			};

			const controller = buildCreateFolders(mockService as any);
			await controller(req as any, res as any, () => {});

			assert.strictEqual(recordedAudit.caseId, 'case-1');
			assert.strictEqual(recordedAudit.action, AUDIT_ACTIONS.FOLDER_CREATED);
			assert.strictEqual(recordedAudit.userId, 'user-123');
			assert.deepStrictEqual(recordedAudit.metadata, { folderName: 'Test Folder' });
		});
	});
});
