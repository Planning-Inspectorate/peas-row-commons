import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { buildValidateFileRename, getFileSyntaxError } from './file-validation.ts';

describe('getFileSyntaxError', () => {
	it('should return an error if the file name is empty', () => {
		const result = getFileSyntaxError('');
		assert.ok(result);
		assert.strictEqual(result.text, 'File name is required');
	});

	it('should return null for a valid file name', () => {
		assert.strictEqual(getFileSyntaxError('My File'), null);
	});
});

describe('buildValidateFileRename Middleware', () => {
	let mockReq: any;
	let mockRes: any;
	let mockNext: any;
	let mockService: any;
	let mockSessionFn: any;

	beforeEach(() => {
		mockReq = {
			params: { id: 'case-123', folderId: 'folder-789', folderName: 'My Folder', fileId: 'file-456' },
			body: { fileName: '  My File  ' },
			originalUrl: '/current/url'
		};
		mockRes = {
			redirect: mock.fn()
		};
		mockNext = mock.fn();
		mockService = { db: {} };
		mockSessionFn = mock.fn();
	});

	it('should sanitize name, pass validation, and call next()', async () => {
		const middleware = buildValidateFileRename(mockService, mockSessionFn);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 1);
		assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		assert.strictEqual(mockSessionFn.mock.callCount(), 0);
	});

	it('should redirect and write file-specific session keys on syntax error', async () => {
		mockReq.body.fileName = '';

		const middleware = buildValidateFileRename(mockService, mockSessionFn);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
		assert.strictEqual(mockNext.mock.callCount(), 0);
		assert.strictEqual(
			mockRes.redirect.mock.calls[0].arguments[0],
			'/cases/case-123/case-folders/folder-789/My%20Folder/file-456/rename-file'
		);

		assert.strictEqual(mockSessionFn.mock.callCount(), 1);
		const args = mockSessionFn.mock.calls[0].arguments;
		assert.strictEqual(args[1], 'case-123');
		assert.strictEqual(args[3], 'files');
		assert.strictEqual(args[2].renameFileErrors[0].text, 'File name is required');
		assert.strictEqual(args[2].erroredFileName, '');
	});

	it('should throw if fileId param is missing', async () => {
		delete mockReq.params.fileId;

		const middleware = buildValidateFileRename(mockService, mockSessionFn);

		await assert.rejects(async () => await middleware(mockReq, mockRes, mockNext), {
			message: 'fileId must be a single string value'
		});
	});
});
