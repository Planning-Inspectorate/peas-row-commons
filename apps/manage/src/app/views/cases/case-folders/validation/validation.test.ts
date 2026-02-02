import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
	buildValidateFolder,
	sanitiseFolderName,
	getSyntaxError,
	getDuplicateErrorsCreate,
	getDuplicateErrorsRename
} from './validation.ts';

describe('Folder Validation Utils', () => {
	describe('sanitiseFolderName', () => {
		it('should return empty string if input is not a string', () => {
			assert.strictEqual(sanitiseFolderName(null as any), '');
			assert.strictEqual(sanitiseFolderName(undefined as any), '');
			assert.strictEqual(sanitiseFolderName(123 as any), '');
		});

		it('should trim whitespace from start and end', () => {
			assert.strictEqual(sanitiseFolderName('  My Folder  '), 'My Folder');
		});

		it('should replace multiple internal spaces with a single space', () => {
			assert.strictEqual(sanitiseFolderName('My    Great   Folder'), 'My Great Folder');
		});

		it('should handle both trimming and internal spacing simultaneously', () => {
			assert.strictEqual(sanitiseFolderName('  Wait   For    It  '), 'Wait For It');
		});
	});

	describe('getSyntaxError', () => {
		it('should return null for valid folder names', () => {
			assert.strictEqual(getSyntaxError('Valid Name'), null);
			assert.strictEqual(getSyntaxError('Folder-123_Test'), null);
			assert.strictEqual(getSyntaxError("O'Connor Project"), null);
		});

		it('should return error if name is too short (< 3)', () => {
			const result = getSyntaxError('AB');
			assert.ok(result);
			assert.match(result.text, /between 3 and 255/);
		});

		it('should return error if name is too long (> 255)', () => {
			const longName = 'a'.repeat(256);
			const result = getSyntaxError(longName);
			assert.ok(result);
			assert.match(result.text, /between 3 and 255/);
		});

		it('should return error for invalid special characters', () => {
			const invalidNames = ['Folder@', 'Folder!', 'Folder/Sub', 'Folder?'];

			invalidNames.forEach((name) => {
				const result = getSyntaxError(name);
				assert.ok(result);
				assert.match(result.text, /special characters/);
			});
		});
	});

	describe('getDuplicateErrorCreate', () => {
		const mockFindFirst = mock.fn();
		const mockDb = { folder: { findFirst: mockFindFirst } } as any;

		beforeEach(() => {
			mockFindFirst.mock.resetCalls();
		});

		it('should return null if no folder exists in DB', async () => {
			mockFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null) as any);

			const result = await getDuplicateErrorsCreate(mockDb, 'case-1', 'parent-1', 'New Folder');

			assert.strictEqual(result, null);
			const callArgs = mockFindFirst.mock.calls[0].arguments[0];
			assert.strictEqual(callArgs.where.caseId, 'case-1');
			assert.strictEqual(callArgs.where.parentFolderId, 'parent-1');
			assert.strictEqual(callArgs.where.displayName, 'New Folder');
		});

		it('should return error if exact match exists', async () => {
			mockFindFirst.mock.mockImplementationOnce(() => Promise.resolve({ displayName: 'Existing Folder' }) as any);

			const result = await getDuplicateErrorsCreate(mockDb, 'case-1', 'parent-1', 'Existing Folder');

			assert.ok(result);
			assert.strictEqual(result.text, 'Folder name already exists');
		});

		it('should return error if case-insensitive match exists', async () => {
			mockFindFirst.mock.mockImplementationOnce(() => Promise.resolve({ displayName: 'Existing Folder' }) as any);

			const result = await getDuplicateErrorsCreate(mockDb, 'case-1', 'parent-1', 'existing folder');

			assert.ok(result);
			assert.strictEqual(result.text, 'Folder name already exists');
		});

		it('should handle undefined parentId correctly', async () => {
			mockFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null) as any);

			await getDuplicateErrorsCreate(mockDb, 'case-1', undefined, 'New Folder');

			const callArgs = mockFindFirst.mock.calls[0].arguments[0];
			assert.strictEqual(callArgs.where.parentFolderId, undefined);
		});
	});

	describe('getDuplicateErrorsRename', () => {
		const mockFindUnique = mock.fn() as any;
		const mockFindFirst = mock.fn() as any;
		const mockDb = {
			folder: {
				findUnique: mockFindUnique,
				findFirst: mockFindFirst
			}
		} as any;

		beforeEach(() => {
			mockFindUnique.mock.resetCalls();
			mockFindFirst.mock.resetCalls();
		});

		it('should throw error if the folder being renamed cannot be found', async () => {
			mockFindUnique.mock.mockImplementationOnce(() => Promise.resolve(null));

			await assert.rejects(async () => await getDuplicateErrorsRename(mockDb, 'case-1', 'folder-missing', 'New Name'), {
				message: 'Could not find folder for id'
			});
		});

		it('should return null if no duplicate exists in the parent folder', async () => {
			mockFindUnique.mock.mockImplementationOnce(() => Promise.resolve({ parentFolderId: 'parent-99' }));
			mockFindFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

			const result = await getDuplicateErrorsRename(mockDb, 'case-1', 'folder-123', 'My New Name');

			assert.strictEqual(result, null);

			const findFirstArgs = mockFindFirst.mock.calls[0].arguments[0];
			assert.strictEqual(findFirstArgs.where.parentFolderId, 'parent-99');

			assert.deepStrictEqual(findFirstArgs.where.NOT, { id: 'folder-123' });
		});

		it('should return error if a different folder in the same parent has the name', async () => {
			mockFindUnique.mock.mockImplementationOnce(() => Promise.resolve({ parentFolderId: 'parent-99' }));
			mockFindFirst.mock.mockImplementationOnce(() =>
				Promise.resolve({ id: 'folder-456', displayName: 'Target Name' })
			);

			const result = await getDuplicateErrorsRename(mockDb, 'case-1', 'folder-123', 'Target Name');

			assert.ok(result);
			assert.strictEqual(result.text, 'Folder name already exists');
		});
	});
});

describe('buildValidateFolder Middleware', () => {
	let mockReq: any;
	let mockRes: any;
	let mockNext: any;
	let mockDb: any;
	let mockService: any;
	let mockSessionFn: any;

	beforeEach(() => {
		mockReq = {
			params: { id: 'case-123', folderId: 'folder-456' },
			body: { folderName: '  My Folder  ' },
			originalUrl: '/current/url'
		};
		mockRes = {
			redirect: mock.fn()
		};
		mockNext = mock.fn();
		mockDb = {
			folder: { findFirst: mock.fn() }
		};
		mockService = { db: mockDb };
		mockSessionFn = mock.fn();
	});

	it('should sanitize name, pass validation, and call next()', async () => {
		mockDb.folder.findFirst.mock.mockImplementationOnce(() => Promise.resolve(null));

		const middleware = buildValidateFolder(mockService, 'create', mockSessionFn);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockReq.body.folderName, 'My Folder');
		assert.strictEqual(mockNext.mock.callCount(), 1);
		assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		assert.strictEqual(mockSessionFn.mock.callCount(), 0);
	});

	it('should redirect and write to session on syntax error', async () => {
		mockReq.body.folderName = 'AB';

		const middleware = buildValidateFolder(mockService, 'create', mockSessionFn);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockRes.redirect.mock.callCount(), 1);

		assert.strictEqual(mockSessionFn.mock.callCount(), 1);
		const args = mockSessionFn.mock.calls[0].arguments;
		assert.strictEqual(args[1], 'case-123');
		assert.strictEqual(args[3], 'folders');
		assert.strictEqual(args[2].createFolderErrors[0].text, 'Folder name must be between 3 and 255 characters');
	});

	it('should redirect and write to session on duplicate error', async () => {
		mockDb.folder.findFirst.mock.mockImplementationOnce(() => Promise.resolve({ displayName: 'My Folder' }));

		const middleware = buildValidateFolder(mockService, 'create', mockSessionFn);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
		assert.strictEqual(mockSessionFn.mock.callCount(), 1);
		assert.strictEqual(
			mockSessionFn.mock.calls[0].arguments[2].createFolderErrors[0].text,
			'Folder name already exists'
		);
	});

	describe('Mode: "edit"', () => {
		beforeEach(() => {
			mockReq.params.folderId = 'folder-to-edit-123';
			mockReq.body.folderName = 'New Name';

			mockDb.folder.findUnique = mock.fn();
		});

		it('should perform Rename validation and call next() on success', async () => {
			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve({ parentFolderId: 'parent-1' }));

			mockDb.folder.findFirst.mock.mockImplementation(() => Promise.resolve(null));

			const middleware = buildValidateFolder(mockService, 'edit', mockSessionFn);
			await middleware(mockReq, mockRes, mockNext);

			assert.strictEqual(mockNext.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});

		it('should use "createFolderErrors" session key on duplicate error', async () => {
			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve({ parentFolderId: 'parent-1' }));

			mockDb.folder.findFirst.mock.mockImplementation(() => Promise.resolve({ displayName: 'New Name' }));

			const middleware = buildValidateFolder(mockService, 'edit', mockSessionFn);
			await middleware(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			const args = mockSessionFn.mock.calls[0].arguments;
			assert.strictEqual(args[2].createFolderErrors[0].text, 'Folder name already exists');
		});

		it('should pass error to next() if folder lookup fails entirely', async () => {
			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			const middleware = buildValidateFolder(mockService, 'edit', mockSessionFn);
			await middleware(mockReq, mockRes, mockNext);

			assert.strictEqual(mockNext.mock.callCount(), 1);
			const error = mockNext.mock.calls[0].arguments[0];
			assert.ok(error);
			assert.match(error.message, /Could not find folder for id/);
		});
	});
});
