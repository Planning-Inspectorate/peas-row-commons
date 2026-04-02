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
		folder: { findUnique: mock.fn(), findMany: mock.fn() },
		case: { findUnique: mock.fn() },
		document: { findMany: mock.fn(), count: mock.fn() }
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
			session: { account: { localAccountId: 'user-456' } },
			originalUrl: '/cases/case-123/folders/folder-456',
			...overrides
		}) as any;

	const service = { db: mockDb, logger: mockLogger };

	beforeEach(() => {
		mockDb.folder.findUnique.mock.resetCalls();
		mockDb.folder.findMany.mock.resetCalls();
		mockDb.case.findUnique.mock.resetCalls();
		mockDb.document.findMany.mock.resetCalls();
		mockDb.document.count.mock.resetCalls();
		mockLogger.error.mock.resetCalls();

		mockDb.case.findUnique.mock.mockImplementation(() =>
			Promise.resolve({ reference: 'REF-123', name: 'Case Name', statusId: 1, legacyCaseId: null })
		);
		mockDb.document.findMany.mock.mockImplementation(() =>
			Promise.resolve([
				{
					id: 'doc-1',
					fileName: 'doc.pdf',
					uploadedDate: Date.now(),
					Folder: { id: 'folder-456', displayName: 'My Folder' },
					UserDocuments: []
				}
			])
		);
		mockDb.document.count.mock.mockImplementation(() => Promise.resolve(10));
		mockDb.folder.findMany.mock.mockImplementation(() =>
			Promise.resolve([
				{ id: 'folder-456', displayName: 'My Folder', parentFolderId: 'parent-999' },
				{ id: 'parent-999', displayName: 'Parent Folder', parentFolderId: null }
			])
		);
	});

	describe('Validation', () => {
		it('should throw error if "id" param is missing', async () => {
			const req = mockReq({ params: { folderId: 'folder-456' } });
			const res = mockRes();
			const next = mock.fn();

			await assert.rejects(() => buildViewCaseFolder(service as any)(req, res, next), { message: 'id param required' });
		});

		it('should throw error if "folderId" param is missing', async () => {
			const req = mockReq({ params: { id: 'case-123' } });
			const res = mockRes();
			const next = mock.fn();

			await assert.rejects(() => buildViewCaseFolder(service as any)(req, res, next), {
				message: 'folderId param required'
			});
		});
	});

	describe('Happy Path', () => {
		it('should fetch folder data and render the view', async () => {
			const req = mockReq();
			const res = mockRes();
			const next = mock.fn();

			const mockFolderData = {
				id: 'folder-456',
				displayName: 'My Folder',
				parentFolderId: null,
				caseId: 'case-123',
				ChildFolders: [{ id: 'sub-1', displayName: 'Subfolder' }],
				ParentFolder: { id: 'parent-999', displayName: 'Parent Folder' }
			};

			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve(mockFolderData));

			await buildViewCaseFolder(service as any)(req, res, next);

			assert.strictEqual(mockDb.folder.findUnique.mock.callCount(), 2);
			assert.strictEqual(mockDb.case.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockDb.document.findMany.mock.callCount(), 2);
			assert.strictEqual(mockDb.document.count.mock.callCount(), 2);

			const dbArgs = mockDb.folder.findUnique.mock.calls[0].arguments[0];
			assert.deepStrictEqual(dbArgs.where, { id: 'folder-456' });
			assert.ok(dbArgs.include);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const [viewPath, viewData] = res.render.mock.calls[0].arguments;

			assert.strictEqual(viewPath, 'views/cases/case-folders/case-folder/view.njk');
			assert.strictEqual(viewData.pageHeading, 'Case Name');
			assert.strictEqual(viewData.folderName, 'My Folder');

			assert.strictEqual(viewData.paginationParams.totalDocuments, 10);
			assert.strictEqual(viewData.paginationParams.totalFilteredDocuments, 10);

			assert.match(viewData.backLinkUrl, /parent-999/);

			assert.strictEqual(viewData.subFolders.length, 1);
			assert.strictEqual(viewData.documents.length, 1);

			assert.ok(viewData.breadcrumbItems);
			assert.strictEqual(viewData.breadcrumbItems[0].text, 'Manage case files');
		});

		it('should render correct backlink when no parent folder exists', async () => {
			const req = mockReq();
			const res = mockRes();
			const next = mock.fn();

			const mockFolderData = {
				id: 'folder-root',
				displayName: 'Root Folder',
				caseId: 'case-123',
				ChildFolders: [],
				ParentFolder: null
			};

			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve(mockFolderData));

			await buildViewCaseFolder(service as any)(req, res, next);

			const viewData = res.render.mock.calls[0].arguments[1];

			assert.ok(!viewData.backLinkUrl.includes('undefined'));
			assert.ok(!viewData.backLinkUrl.includes('null'));
			assert.match(viewData.backLinkUrl, /\/cases\/case-123\/case-folders$/);
		});
	});

	describe('Error Handling', () => {
		it('should pass to notFoundHandler (404) if DB folder returns null', async () => {
			const req = mockReq();
			const res = mockRes();
			const next = mock.fn();

			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			await buildViewCaseFolder(service as any)(req, res, next);

			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(next.mock.callCount(), 0);
		});

		it('should pass to notFoundHandler (404) if Case DB returns null', async () => {
			const req = mockReq();
			const res = mockRes();
			const next = mock.fn();

			mockDb.case.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			await buildViewCaseFolder(service as any)(req, res, next);

			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(next.mock.callCount(), 0);
		});

		it('should wrap and throw generic DB errors', async () => {
			const req = mockReq();
			const res = mockRes();
			const next = mock.fn();
			const dbError = new Error('Database disconnected');

			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.reject(dbError));

			await assert.rejects(() => buildViewCaseFolder(service as any)(req, res, next), dbError);

			assert.strictEqual(next.mock.callCount(), 0);
		});
	});

	describe('getFolderPath', () => {
		it('should return empty array if folder is not found', async () => {
			const mockDb = {
				folder: {
					findUnique: () => Promise.resolve(null),
					findMany: () => Promise.resolve([])
				}
			};

			const result = await getFolderPath(mockDb as any, 'non-existent-folder');

			assert.deepStrictEqual(result, []);
		});

		it('should return single folder when folder has no parent', async () => {
			const mockDb = {
				folder: {
					findMany: () => Promise.resolve([{ id: 'folder-1', displayName: 'Root Folder', parentFolderId: null }]),
					findUnique: () =>
						Promise.resolve({
							id: 'folder-1',
							displayName: 'Root Folder',
							parentFolderId: null,
							caseId: 'case-123'
						})
				}
			};

			const result = await getFolderPath(mockDb as any, 'folder-1');

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].id, 'folder-1');
			assert.strictEqual(result[0].displayName, 'Root Folder');
		});

		it('should return folder path from root to current folder', async () => {
			const allFolders = [
				{ id: 'folder-1', displayName: 'Root', parentFolderId: null },
				{ id: 'folder-2', displayName: 'Documents', parentFolderId: 'folder-1' },
				{ id: 'folder-3', displayName: 'Subfolder', parentFolderId: 'folder-2' }
			];

			const mockDb = {
				folder: {
					findUnique: (args: { where: { id: string } }) => Promise.resolve(folders[args.where.id] ?? null),
					findMany: () => Promise.resolve(allFolders)
				}
			};
			const folders: Record<
				string,
				{ id: string; displayName: string; parentFolderId: string | null; caseId: string | null }
			> = {
				'folder-3': { id: 'folder-3', displayName: 'Subfolder', parentFolderId: 'folder-2', caseId: 'case-123' },
				'folder-2': { id: 'folder-2', displayName: 'Documents', parentFolderId: 'folder-1', caseId: 'case-123' },
				'folder-1': { id: 'folder-1', displayName: 'Root', parentFolderId: null, caseId: 'case-123' }
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
			const allFolders = [{ id: 'folder-2', displayName: 'Orphan', parentFolderId: 'missing-folder' }];

			const mockDb = {
				folder: {
					findUnique: (args: { where: { id: string } }) => Promise.resolve(folders[args.where.id] ?? null),
					findMany: () => Promise.resolve(allFolders)
				}
			};
			const folders: Record<
				string,
				{ id: string; displayName: string; parentFolderId: string | null; caseId: string | null }
			> = {
				'folder-2': { id: 'folder-2', displayName: 'Orphan', parentFolderId: 'missing-folder', caseId: 'case-123' }
			};

			const result = await getFolderPath(mockDb as any, 'folder-2');

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].id, 'folder-2');
		});
	});
});
