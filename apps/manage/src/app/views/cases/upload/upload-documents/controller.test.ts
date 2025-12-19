import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'stream';
import { uploadDocumentsController } from './controller.ts';

describe('uploadDocumentsController', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockBlobStore = {
		uploadStream: mock.fn()
	} as any;

	const mockReq = (overrides = {}) =>
		({
			params: { id: 'case-123', folderId: 'folder-456' },
			sessionID: 'session-abc',
			files: [],
			...overrides
		}) as any;

	const mockRes = () =>
		({
			json: mock.fn(),
			status: mock.fn(() => ({ json: mock.fn() }))
		}) as any;

	const createMockFile = (name = 'test.pdf', size = 1024) => ({
		originalname: name,
		mimetype: 'application/pdf',
		buffer: Buffer.from('fake-content'),
		size: size
	});

	describe('Happy Path', () => {
		it('should upload file, save to DB, and return success JSON', async () => {
			const file = createMockFile();
			const req = mockReq({ files: [file] });
			const res = mockRes();

			const mockDb = {
				draftDocument: {
					create: mock.fn((args: any) => Promise.resolve(args))
				},
				$transaction: mock.fn(() =>
					Promise.resolve([
						{
							id: 'doc-generated-id',
							fileName: 'test.pdf',
							blobName: 'case-123/uuid-xyz',
							size: BigInt(1024)
						}
					])
				)
			} as any;

			mockBlobStore.uploadStream.mock.mockImplementation(() => Promise.resolve());

			const service = { db: mockDb, blobStore: mockBlobStore, logger: mockLogger };

			await uploadDocumentsController(service as any)(req as any, res as any);

			assert.strictEqual(mockBlobStore.uploadStream.mock.callCount(), 1);
			const uploadArgs = mockBlobStore.uploadStream.mock.calls[0].arguments;
			assert.ok(uploadArgs[0] instanceof Readable, 'First arg should be a Readable stream');
			assert.strictEqual(uploadArgs[1], 'application/pdf');

			assert.match(uploadArgs[2], /^case-123\/[0-9a-f-]+$/i);

			assert.strictEqual(mockDb.draftDocument.create.mock.callCount(), 1);
			const dbCreateArgs = mockDb.draftDocument.create.mock.calls[0].arguments[0];

			assert.deepStrictEqual(dbCreateArgs.data, {
				sessionKey: 'session-abc',
				caseId: 'case-123',
				folderId: 'folder-456',
				fileName: 'test.pdf',
				blobName: uploadArgs[2],
				size: BigInt(1024),
				mimeType: 'application/pdf'
			});

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);

			assert.strictEqual(res.json.mock.callCount(), 1);
			const jsonResponse = res.json.mock.calls[0].arguments[0];

			assert.strictEqual(jsonResponse.file.id, 'doc-generated-id');
			assert.strictEqual(jsonResponse.file.originalname, 'test.pdf');

			assert.match(jsonResponse.success.messageHtml, /test\.pdf/);
		});

		it('should sanitize filenames using latin1 -> utf8 logic', async () => {
			const req = mockReq({ files: [createMockFile('test.pdf')] });

			const res = mockRes();

			const mockDb = {
				draftDocument: { create: mock.fn() },
				$transaction: mock.fn(() =>
					Promise.resolve([
						{
							id: 'doc-1',
							fileName: 'test.pdf',
							blobName: 'path',
							size: BigInt(100)
						}
					])
				)
			} as any;

			const service = { db: mockDb, blobStore: mockBlobStore, logger: mockLogger };
			await uploadDocumentsController(service as any)(req as any, res as any);

			const dbData = mockDb.draftDocument.create.mock.calls[0].arguments[0].data;
			assert.strictEqual(typeof dbData.fileName, 'string');
		});
	});

	describe('Error Handling', () => {
		it('should log error and throw if BlobStore upload fails', async () => {
			const req = mockReq({ files: [createMockFile()] });
			const res = mockRes();

			const mockDb = {
				draftDocument: { create: mock.fn() },
				$transaction: mock.fn()
			} as any;

			const uploadError = new Error('Azure Network Error');
			mockBlobStore.uploadStream.mock.mockImplementation(() => Promise.reject(uploadError));

			const service = { db: mockDb, blobStore: mockBlobStore, logger: mockLogger };

			await assert.rejects(() => uploadDocumentsController(service as any)(req as any, res as any), {
				message: 'Failed to upload file'
			});

			assert.strictEqual(mockLogger.error.mock.callCount(), 1);
			assert.strictEqual(mockLogger.error.mock.calls[0].arguments[0].error, uploadError);

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 0);
		});

		it('should propagate error if DB transaction fails', async () => {
			const req = mockReq({ files: [createMockFile()] });
			const res = mockRes();

			mockBlobStore.uploadStream.mock.resetCalls();

			mockBlobStore.uploadStream.mock.mockImplementation(() => Promise.resolve());

			const dbError = new Error('Prisma Error');
			const mockDb = {
				draftDocument: { create: mock.fn() },
				$transaction: mock.fn(() => Promise.reject(dbError))
			} as any;

			const service = { db: mockDb, blobStore: mockBlobStore, logger: mockLogger };

			await assert.rejects(() => uploadDocumentsController(service as any)(req as any, res as any), dbError);

			assert.strictEqual(mockBlobStore.uploadStream.mock.callCount(), 1);
		});
	});
});
