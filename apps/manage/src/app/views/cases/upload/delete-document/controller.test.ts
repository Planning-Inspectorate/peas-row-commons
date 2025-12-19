import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { deleteDocumentController } from './controller.ts';

describe('deleteDocumentController', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockBlobStore = {
		deleteBlobIfExists: mock.fn()
	} as any;

	const mockReq = (overrides = {}) =>
		({
			body: { delete: 'doc-123' },
			sessionID: 'session-abc',
			...overrides
		}) as any;

	const mockRes = () =>
		({
			json: mock.fn(),
			status: mock.fn(() => ({ json: mock.fn() }))
		}) as any;

	describe('Validation', () => {
		it('should throw error if documentId is missing in body', async () => {
			const req = mockReq({ body: {} }); // Missing 'delete' key
			const res = mockRes();
			const service = { logger: mockLogger };

			const controller = deleteDocumentController(service as any);

			await assert.rejects(() => controller(req as any, res as any), { message: 'documentId required' });
		});

		it('should throw error if documentId is not a string', async () => {
			const req = mockReq({ body: { delete: 123 } });
			const res = mockRes();
			const service = { logger: mockLogger };

			const controller = deleteDocumentController(service as any);

			await assert.rejects(() => controller(req as any, res as any), { message: 'documentId required' });
		});
	});

	describe('Logic Flow', () => {
		it('should succeed: delete DB row and then delete Blob', async () => {
			const mockDb = {
				draftDocument: {
					findFirst: mock.fn(() =>
						Promise.resolve({
							id: 'doc-123',
							blobName: 'blob-abc'
						})
					),
					delete: mock.fn(() => Promise.resolve())
				}
			} as any;

			const service = { db: mockDb, blobStore: mockBlobStore, logger: mockLogger };
			const req = mockReq();
			const res = mockRes();

			await deleteDocumentController(service as any)(req as any, res as any);

			assert.strictEqual(mockDb.draftDocument.findFirst.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.draftDocument.findFirst.mock.calls[0].arguments[0].where, {
				id: 'doc-123',
				sessionKey: 'session-abc'
			});

			assert.strictEqual(mockDb.draftDocument.delete.mock.callCount(), 1);
			assert.strictEqual(mockDb.draftDocument.delete.mock.calls[0].arguments[0].where.id, 'doc-123');

			assert.strictEqual(mockBlobStore.deleteBlobIfExists.mock.callCount(), 1);
			assert.strictEqual(mockBlobStore.deleteBlobIfExists.mock.calls[0].arguments[0], 'blob-abc');

			assert.strictEqual(res.json.mock.callCount(), 1);
			assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], { success: true });
		});

		it('should succeed (early return): if no draft found, do not try to delete', async () => {
			const mockDb = {
				draftDocument: {
					findFirst: mock.fn(() => Promise.resolve(null)),
					delete: mock.fn()
				}
			};

			mockBlobStore.deleteBlobIfExists.mock.resetCalls();

			const service = { db: mockDb, blobStore: mockBlobStore, logger: mockLogger };
			const req = mockReq();
			const res = mockRes();

			await deleteDocumentController(service as any)(req as any, res as any);

			assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
			assert.strictEqual(mockDb.draftDocument.delete.mock.callCount(), 0);
			assert.strictEqual(mockBlobStore.deleteBlobIfExists.mock.callCount(), 0);

			assert.strictEqual(res.json.mock.callCount(), 1);
		});

		it('should succeed: delete DB row, skip Blob delete if no blobName', async () => {
			const mockDb = {
				draftDocument: {
					findFirst: mock.fn(() => Promise.resolve({ id: 'doc-123', blobName: null })),
					delete: mock.fn()
				}
			};
			mockBlobStore.deleteBlobIfExists.mock.resetCalls();

			const service = { db: mockDb, blobStore: mockBlobStore, logger: mockLogger };
			const req = mockReq();
			const res = mockRes();

			await deleteDocumentController(service as any)(req as any, res as any);

			assert.strictEqual(mockDb.draftDocument.delete.mock.callCount(), 1);

			assert.strictEqual(mockBlobStore.deleteBlobIfExists.mock.callCount(), 0);
			assert.strictEqual(res.json.mock.callCount(), 1);
		});

		it('should handle BlobStore errors gracefully (Log error but return success)', async () => {
			const mockDb = {
				draftDocument: {
					findFirst: mock.fn(() => Promise.resolve({ id: 'doc-123', blobName: 'blob-abc' })),
					delete: mock.fn()
				}
			};
			const faultyBlobStore = {
				deleteBlobIfExists: mock.fn(() => Promise.reject(new Error('Azure Error')))
			};

			const service = { db: mockDb, blobStore: faultyBlobStore, logger: mockLogger };
			const req = mockReq();
			const res = mockRes();

			await deleteDocumentController(service as any)(req as any, res as any);

			assert.strictEqual(mockLogger.error.mock.callCount(), 1);
			assert.match(mockLogger.error.mock.calls[0].arguments[1], /Failed to delete blob/);

			assert.strictEqual(res.json.mock.callCount(), 1);
			assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], { success: true });
		});
	});
});
