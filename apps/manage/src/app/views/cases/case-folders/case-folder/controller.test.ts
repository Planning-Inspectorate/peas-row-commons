import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildViewCaseFolder, getFolderPath } from './controller.ts';

describe('buildViewCaseFolder', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockDb = {
		folder: { findUnique: mock.fn() }
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
			query: {},
			session: {},
			originalUrl: '/cases/case-123/folders/folder-456',
			...overrides
		}) as any;

	const service = { db: mockDb, logger: mockLogger };

	beforeEach(() => {
		mockDb.folder.findUnique.mock.resetCalls();
		mockLogger.error.mock.resetCalls();
	});

	describe('Validation', () => {
		it('should throw error if "id" param is missing', async () => {
			const req = mockReq({ params: { folderId: 'folder-456' } });
			const res = mockRes();

			await assert.rejects(() => buildViewCaseFolder(service as any)(req, res), { message: 'id param required' });
		});

		it('should throw error if "folderId" param is missing', async () => {
			const req = mockReq({ params: { id: 'case-123' } });
			const res = mockRes();

			await assert.rejects(() => buildViewCaseFolder(service as any)(req, res), { message: 'folderId param required' });
		});
	});

	describe('Happy Path', () => {
		it('should fetch folder data and render the view', async () => {
			const req = mockReq();
			const res = mockRes();

			const mockFolderData = {
				id: 'folder-456',
				displayName: 'My Folder',
				parentFolderId: null,
				Case: { reference: 'REF-123', name: 'Case Name' },
				ChildFolders: [{ id: 'sub-1', displayName: 'Subfolder' }],
				Documents: [{ id: 'doc-1', fileName: 'doc.pdf', uploadedDate: Date.now() }],
				_count: { Documents: 10 },
				ParentFolder: { id: 'parent-999', displayName: 'Parent Folder' }
			};

			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve(mockFolderData));

			await buildViewCaseFolder(service as any)(req, res);

			// Called twice: once for main query, once for getFolderPath
			assert.strictEqual(mockDb.folder.findUnique.mock.callCount(), 2);

			const dbArgs = mockDb.folder.findUnique.mock.calls[0].arguments[0];
			assert.deepStrictEqual(dbArgs.where, { id: 'folder-456' });
			assert.ok(dbArgs.include);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const [viewPath, viewData] = res.render.mock.calls[0].arguments;

			assert.strictEqual(viewPath, 'views/cases/case-folders/case-folder/view.njk');
			assert.strictEqual(viewData.pageHeading, 'Case Name');
			assert.strictEqual(viewData.folderName, 'My Folder');

			assert.strictEqual(viewData.paginationParams.totalDocuments, 10);

			assert.match(viewData.backLinkUrl, /parent-999/);

			assert.strictEqual(viewData.subFolders.length, 1);
			assert.strictEqual(viewData.documents.length, 1);

			// Verify breadcrumbs are included
			assert.ok(viewData.breadcrumbItems);
			assert.strictEqual(viewData.breadcrumbItems[0].text, 'Manage case files');
		});

		it('should render correct backlink when no parent folder exists', async () => {
			const req = mockReq();
			const res = mockRes();

			const mockFolderData = {
				id: 'folder-root',
				displayName: 'Root Folder',
				Case: { reference: 'REF-123', name: 'Case Name' },
				ChildFolders: [],
				Documents: [],
				_count: { Documents: 0 },
				ParentFolder: null
			};

			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve(mockFolderData));

			await buildViewCaseFolder(service as any)(req, res);

			const viewData = res.render.mock.calls[0].arguments[1];

			assert.ok(!viewData.backLinkUrl.includes('undefined'));
			assert.ok(!viewData.backLinkUrl.includes('null'));
			assert.match(viewData.backLinkUrl, /\/cases\/case-123\/case-folders$/);
		});
	});

	describe('Error Handling', () => {
		it('should throw "Folder not found" if DB returns null', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			await assert.rejects(() => buildViewCaseFolder(service as any)(req, res), { message: 'Folder not found' });

			assert.strictEqual(res.render.mock.callCount(), 0);
		});

		it('should propagate generic DB errors', async () => {
			const req = mockReq();
			const res = mockRes();
			const dbError = new Error('Database disconnected');

			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.reject(dbError));

			await assert.rejects(() => buildViewCaseFolder(service as any)(req, res), dbError);

			assert.strictEqual(mockLogger.error.mock.callCount(), 0);
		});
	});

	describe('getFolderPath', () => {
		it('should return empty array if folder is not found', async () => {
			const mockDb = {
				folder: {
					findUnique: () => Promise.resolve(null)
				}
			};

			const result = await getFolderPath(mockDb as any, 'non-existent-folder');

			assert.deepStrictEqual(result, []);
		});

		it('should return single folder when folder has no parent', async () => {
			const mockDb = {
				folder: {
					findUnique: () =>
						Promise.resolve({
							id: 'folder-1',
							displayName: 'Root Folder',
							parentFolderId: null
						})
				}
			};

			const result = await getFolderPath(mockDb as any, 'folder-1');

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].id, 'folder-1');
			assert.strictEqual(result[0].displayName, 'Root Folder');
		});

		it('should return folder path from root to current folder', async () => {
			const folders: Record<string, { id: string; displayName: string; parentFolderId: string | null }> = {
				'folder-3': { id: 'folder-3', displayName: 'Subfolder', parentFolderId: 'folder-2' },
				'folder-2': { id: 'folder-2', displayName: 'Documents', parentFolderId: 'folder-1' },
				'folder-1': { id: 'folder-1', displayName: 'Root', parentFolderId: null }
			};

			const mockDb = {
				folder: {
					findUnique: (args: { where: { id: string } }) => Promise.resolve(folders[args.where.id] ?? null)
				}
			};

			const result = await getFolderPath(mockDb as any, 'folder-3');

			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].id, 'folder-1');
			assert.strictEqual(result[0].displayName, 'Root');
			assert.strictEqual(result[1].id, 'folder-2');
			assert.strictEqual(result[1].displayName, 'Documents');
			assert.strictEqual(result[2].id, 'folder-3');
			assert.strictEqual(result[2].displayName, 'Subfolder');
		});

		it('should stop traversing if a parent folder is not found', async () => {
			const folders: Record<string, { id: string; displayName: string; parentFolderId: string | null }> = {
				'folder-2': { id: 'folder-2', displayName: 'Orphan', parentFolderId: 'missing-folder' }
			};

			const mockDb = {
				folder: {
					findUnique: (args: { where: { id: string } }) => Promise.resolve(folders[args.where.id] ?? null)
				}
			};

			const result = await getFolderPath(mockDb as any, 'folder-2');

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].id, 'folder-2');
		});
	});
});
