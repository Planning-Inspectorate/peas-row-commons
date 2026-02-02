import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildValidateDeleteFolder } from './validation.ts';

describe('Validate Delete Folder Middleware', () => {
	const createMocks = (folderData: any = null, dbError: any = null) => {
		const mockDb = {
			folder: {
				findUnique: mock.fn(async () => {
					if (dbError) throw dbError;
					return folderData;
				})
			}
		};

		const mockLogger = { error: mock.fn() };
		const mockService = { db: mockDb, logger: mockLogger };

		const req = {
			params: { folderId: 'folder-123', id: 'case-1' },
			originalUrl: '/original-url'
		};

		const res = {
			redirect: mock.fn()
		};

		const next = mock.fn();
		const setSessionData = mock.fn();

		return { mockService, req, res, next, setSessionData, mockDb };
	};

	it('should call next() if no folderId is present', async () => {
		const { mockService, res, next, setSessionData } = createMocks();
		const req = { params: { id: 'case-1' } };

		const handler = buildValidateDeleteFolder(mockService as any, setSessionData);
		await handler(req as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(setSessionData.mock.callCount(), 0);
	});

	it('should call next() if folder is empty', async () => {
		const folderData = {
			_count: { ChildFolders: 0, Documents: 0 }
		};
		const { mockService, req, res, next, setSessionData } = createMocks(folderData);

		const handler = buildValidateDeleteFolder(mockService as any, setSessionData);
		await handler(req as any, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(res.redirect.mock.callCount(), 0);
	});

	it('should redirect with "1 issue" error if folder contains only documents', async () => {
		const folderData = {
			_count: { ChildFolders: 0, Documents: 5 }
		};
		const { mockService, req, res, next, setSessionData } = createMocks(folderData);

		const handler = buildValidateDeleteFolder(mockService as any, setSessionData);
		await handler(req as any, res as any, next);

		assert.strictEqual(res.redirect.mock.callCount(), 1);
		assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/original-url');
		assert.strictEqual(next.mock.callCount(), 0);

		assert.strictEqual(setSessionData.mock.callCount(), 1);
		const errors = setSessionData.mock.calls[0].arguments[2].deleteFolderErrors;

		assert.ok(errors[0].html.includes('1 issue'));
		assert.ok(errors[0].html.includes('It contains documents'));
		assert.ok(!errors[0].html.includes('It contains subfolders'));
	});

	it('should redirect with "1 issue" error if folder contains only subfolders', async () => {
		const folderData = {
			_count: { ChildFolders: 2, Documents: 0 }
		};
		const { mockService, req, res, next, setSessionData } = createMocks(folderData);

		const handler = buildValidateDeleteFolder(mockService as any, setSessionData);
		await handler(req as any, res as any, next);

		assert.strictEqual(res.redirect.mock.callCount(), 1);

		const errors = setSessionData.mock.calls[0].arguments[2].deleteFolderErrors;
		assert.ok(errors[0].html.includes('1 issue'));
		assert.ok(errors[0].html.includes('It contains subfolders'));
	});

	it('should redirect with "2 issues" error if folder contains both', async () => {
		const folderData = {
			_count: { ChildFolders: 2, Documents: 3 }
		};
		const { mockService, req, res, next, setSessionData } = createMocks(folderData);

		const handler = buildValidateDeleteFolder(mockService as any, setSessionData);
		await handler(req as any, res as any, next);

		assert.strictEqual(res.redirect.mock.callCount(), 1);

		const errors = setSessionData.mock.calls[0].arguments[2].deleteFolderErrors;
		assert.ok(errors[0].html.includes('2 issues'));
		assert.ok(errors[0].html.includes('It contains subfolders'));
		assert.ok(errors[0].html.includes('It contains documents'));
	});
});
