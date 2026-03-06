import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildDownloadDocument } from './controller.ts';

describe('buildDownloadDocument', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		debug: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockDb = {
		document: { findUnique: mock.fn() }
	} as any;

	const mockBlobStore = {
		downloadBlob: mock.fn()
	} as any;

	const mockBlobStream = {
		on: mock.fn(),
		pipe: mock.fn()
	};

	const mockRes = () => {
		const res = {
			setHeader: mock.fn(),
			destroy: mock.fn(),
			on: mock.fn(),
			emit: mock.fn()
		} as any;
		return res;
	};

	const mockReq = (overrides = {}) =>
		({
			params: { documentId: 'doc-123' },
			query: {},
			...overrides
		}) as any;

	const service = {
		db: mockDb,
		logger: mockLogger,
		blobStore: mockBlobStore,
		audit: {
			record: mock.fn(() => Promise.resolve())
		}
	};

	beforeEach(() => {
		mockDb.document.findUnique.mock.resetCalls();
		mockBlobStore.downloadBlob.mock.resetCalls();
		mockLogger.error.mock.resetCalls();
		mockLogger.debug.mock.resetCalls();

		mockBlobStream.on.mock.resetCalls();
		mockBlobStream.pipe.mock.resetCalls();
	});

	describe('Validation', () => {
		it('should throw error if "documentId" param is missing', async () => {
			const req = mockReq({ params: {} });
			const res = mockRes();

			await assert.rejects(() => buildDownloadDocument(service as any)(req, res), {
				message: 'documentId param required'
			});
		});
	});

	describe('Metadata Retrieval (Stage 1)', () => {
		it('should stop and return undefined if DB returns null (Document not found)', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			await assert.rejects(() => buildDownloadDocument(service as any)(req, res), {
				message: 'No document found for id: doc-123'
			});

			assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 0);
		});

		it('should handle DB errors via wrapPrismaError', async () => {
			const req = mockReq();
			const res = mockRes();
			const dbError = new Error('DB Connection Failed');

			mockDb.document.findUnique.mock.mockImplementation(() => Promise.reject(dbError));

			await assert.rejects(() => buildDownloadDocument(service as any)(req, res), dbError);
		});
	});

	describe('Blob Streaming (Stage 2 & 3)', () => {
		const validDocument = {
			id: 'doc-123',
			blobName: 'container/blob-uuid',
			fileName: 'test-file.pdf'
		};

		const setupSuccessPath = () => {
			mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve(validDocument));
			mockBlobStore.downloadBlob.mock.mockImplementation(() =>
				Promise.resolve({
					readableStreamBody: mockBlobStream,
					contentType: 'application/pdf',
					contentLength: 5000
				})
			);
		};

		it('should force download (attachment) when preview is false/undefined', async () => {
			setupSuccessPath();
			const req = mockReq({ query: { preview: undefined } });
			const res = mockRes();

			await buildDownloadDocument(service as any)(req, res);

			assert.strictEqual(mockDb.document.findUnique.mock.callCount(), 1);

			assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 1);
			assert.strictEqual(mockBlobStore.downloadBlob.mock.calls[0].arguments[0], 'container/blob-uuid');

			const setHeaderCalls = res.setHeader.mock.calls;

			const typeHeader = setHeaderCalls.find((c: { arguments: string[] }) => c.arguments[0] === 'Content-Type');
			assert.strictEqual(typeHeader.arguments[1], 'application/pdf');

			const dispositionHeader = setHeaderCalls.find(
				(c: { arguments: string[] }) => c.arguments[0] === 'Content-Disposition'
			);
			assert.match(dispositionHeader.arguments[1], /^attachment;/);
			assert.match(dispositionHeader.arguments[1], /filename="test-file.pdf"/);

			assert.strictEqual(mockBlobStream.pipe.mock.callCount(), 1);
			assert.strictEqual(mockBlobStream.pipe.mock.calls[0].arguments[0], res);
		});

		it('should preview inline when preview is "true"', async () => {
			setupSuccessPath();
			const req = mockReq({ query: { preview: 'true' } });
			const res = mockRes();

			await buildDownloadDocument(service as any)(req, res);

			const setHeaderCalls = res.setHeader.mock.calls;
			const dispositionHeader = setHeaderCalls.find(
				(c: { arguments: string[] }) => c.arguments[0] === 'Content-Disposition'
			);

			assert.match(dispositionHeader.arguments[1], /^inline;/);
		});

		it('should correctly encode special characters in filenames', async () => {
			mockDb.document.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					...validDocument,
					fileName: 'tést @ file.pdf'
				})
			);

			mockBlobStore.downloadBlob.mock.mockImplementation(() =>
				Promise.resolve({
					readableStreamBody: mockBlobStream,
					contentType: 'application/pdf'
				})
			);

			const req = mockReq();
			const res = mockRes();

			await buildDownloadDocument(service as any)(req, res);

			const setHeaderCalls = res.setHeader.mock.calls;
			const dispositionHeader = setHeaderCalls.find(
				(c: { arguments: string[] }) => c.arguments[0] === 'Content-Disposition'
			);

			assert.match(dispositionHeader.arguments[1], /filename\*=UTF-8''t%C3%A9st%20%40%20file\.pdf/);
		});
	});

	describe('Stream Error Handling', () => {
		const validDocument = { id: 'doc-123', blobName: 'blob', fileName: 'file.pdf' };

		beforeEach(() => {
			mockDb.document.findUnique.mock.mockImplementation(() => Promise.resolve(validDocument));
			mockBlobStore.downloadBlob.mock.mockImplementation(() =>
				Promise.resolve({
					readableStreamBody: mockBlobStream
				})
			);
		});

		it('should attach error listeners to the stream', async () => {
			const req = mockReq();
			const res = mockRes();

			await buildDownloadDocument(service as any)(req, res);

			assert.strictEqual(mockBlobStream.on.mock.callCount(), 1);
			assert.strictEqual(mockBlobStream.on.mock.calls[0].arguments[0], 'error');
		});

		it('should log generic stream errors and destroy response', async () => {
			let errorCallback: Function;
			mockBlobStream.on.mock.mockImplementation((event, cb) => {
				if (event === 'error') errorCallback = cb;
			});

			const req = mockReq();
			const res = mockRes();

			await buildDownloadDocument(service as any)(req, res);

			const streamError = new Error('Stream broke');
			errorCallback!(streamError);

			assert.strictEqual(mockLogger.error.mock.callCount(), 1);
			assert.strictEqual(mockLogger.error.mock.calls[0].arguments[0].err, streamError);
			assert.match(mockLogger.error.mock.calls[0].arguments[1], /stream error/);

			assert.strictEqual(res.destroy.mock.callCount(), 1);
			assert.strictEqual(res.destroy.mock.calls[0].arguments[0], streamError);
		});

		it('should log debug for AbortError (cancelled download)', async () => {
			let errorCallback: Function;
			mockBlobStream.on.mock.mockImplementation((event, cb) => {
				if (event === 'error') errorCallback = cb;
			});

			const req = mockReq();
			const res = mockRes();

			await buildDownloadDocument(service as any)(req, res);

			const abortError = new Error('Abort');
			abortError.name = 'AbortError';
			errorCallback!(abortError);

			assert.strictEqual(mockLogger.debug.mock.callCount(), 1);
			assert.strictEqual(mockLogger.error.mock.callCount(), 0);
			assert.match(mockLogger.debug.mock.calls[0].arguments[1], /cancelled/);
		});

		it('should throw error if blob store fails to initialize', async () => {
			const req = mockReq();
			const res = mockRes();

			const blobError = new Error('Azure Unavailable');
			mockBlobStore.downloadBlob.mock.mockImplementation(() => Promise.reject(blobError));

			await assert.rejects(() => buildDownloadDocument(service as any)(req, res), {
				message: 'Failed to download file from blob store'
			});

			assert.strictEqual(mockLogger.error.mock.callCount(), 1);
			assert.strictEqual(mockLogger.error.mock.calls[0].arguments[0].error, blobError);
		});
	});
	describe('buildDownloadDocument (audit recording)', () => {
		it('should record audit event when file is downloaded', async () => {
			let recordedAudit: any = null;
			let finishCallback: Function;

			const mockBlobStream = {
				on: mock.fn(),
				pipe: mock.fn()
			};

			mockDb.document.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					id: 'doc-123',
					caseId: 'case-1',
					blobName: 'container/blob-uuid',
					fileName: 'report.pdf'
				})
			);

			mockBlobStore.downloadBlob.mock.mockImplementation(() =>
				Promise.resolve({
					readableStreamBody: mockBlobStream,
					contentType: 'application/pdf',
					contentLength: 5000
				})
			);

			const service = {
				db: mockDb,
				logger: mockLogger,
				blobStore: mockBlobStore,
				audit: {
					record: (entry: any) => {
						recordedAudit = entry;
						return Promise.resolve();
					}
				}
			};

			const req = mockReq({
				params: { documentId: 'doc-123', id: 'case-1' },
				session: { account: { localAccountId: 'user-999' } }
			});
			const res = mockRes();

			// Capture the 'finish' listener
			res.on.mock.mockImplementation((event: string, cb: Function) => {
				if (event === 'finish') finishCallback = cb;
			});

			await buildDownloadDocument(service as any)(req, res);

			// Simulate the response finishing
			await finishCallback!();
			assert.strictEqual(recordedAudit.caseId, 'case-1');
			assert.strictEqual(recordedAudit.action, 'FILE_DOWNLOADED');
			assert.strictEqual(recordedAudit.userId, 'user-999');
		});
	});
});
