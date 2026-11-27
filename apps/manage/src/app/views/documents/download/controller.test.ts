import { ManageService } from '#service';
import { readSessionData } from '@planning-inspectorate/core/util';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { buildDownloadDocument } from './controller.ts';

describe('buildDownloadDocument', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		debug: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockDb = {
		document: { findUnique: mock.fn(), findMany: mock.fn() }
	} as any;

	const mockBlobStore = {
		downloadBlob: mock.fn()
	} as any;

	const mockBlobStream = {
		on: mock.fn(),
		pipe: mock.fn()
	};

	const mockArchiveInstance = {
		on: mock.fn(),
		pipe: mock.fn(),
		append: mock.fn(),
		finalize: mock.fn(() => Promise.resolve())
	};

	const mockRes = () => {
		const res = {
			setHeader: mock.fn(),
			redirect: mock.fn(),
			destroy: mock.fn(),
			on: mock.fn(),
			emit: mock.fn(),
			status: mock.fn(() => res),
			render: mock.fn()
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
		},
		createZipArchive: mock.fn(() => mockArchiveInstance)
	};

	beforeEach(() => {
		mockDb.document.findUnique.mock.resetCalls();
		mockDb.document.findMany.mock.resetCalls();
		mockBlobStore.downloadBlob.mock.resetCalls();
		mockLogger.error.mock.resetCalls();
		mockLogger.debug.mock.resetCalls();

		mockBlobStream.on.mock.resetCalls();
		mockBlobStream.pipe.mock.resetCalls();

		mockArchiveInstance.pipe.mock.resetCalls();
		mockArchiveInstance.append.mock.resetCalls();
		mockArchiveInstance.finalize.mock.resetCalls();
		service.createZipArchive.mock.resetCalls();
		service.audit.record.mock.resetCalls();
	});

	describe('Validation', () => {
		it('should throw error if "documentId" param is missing', async () => {
			const req = mockReq({ params: {} });
			const res = mockRes();

			await assert.rejects(() => buildDownloadDocument(service as any)(req, res), {
				message: 'documentId param required for single downloads'
			});
		});

		for (const scanStatus of ['fail', 'pending', 'not-a-real-status', undefined, null]) {
			it(`should not download a file whose virus scan status is "${scanStatus}"`, async () => {
				mockDb.document.findMany.mock.mockImplementation(() =>
					Promise.resolve([
						{
							id: 'doc-123',
							blobName: 'container/blob-uuid',
							fileName: 'file-name.ext',
							caseId: 'case-123',
							folderId: 'folder-1',
							Folder: { displayName: 'My Folder' },
							scanStatus
						}
					])
				);
				mockBlobStore.downloadBlob.mock.mockImplementation(() =>
					Promise.resolve({ readableStreamBody: mockBlobStream })
				);

				const req = mockReq({
					params: {},
					body: {
						selectedFiles: ['doc-123'],
						caseId: 'case-123',
						returnUrl: '/cases/case-123/folder'
					},
					session: {}
				});
				const res = mockRes();

				await buildDownloadDocument(service as any)(req, res);

				assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 0);
			});
		}

		it('should redirect with an error listing failed files and block the entire download', async () => {
			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([
					{
						id: 'doc-1',
						caseId: 'case-123',
						folderId: 'folder-1',
						Folder: { displayName: 'My Folder' },
						blobName: 'container/blob-uuid',
						fileName: 'virus-file-1.ext',
						scanStatus: 'fail'
					},
					{
						id: 'doc-2',
						caseId: 'case-123',
						folderId: 'folder-1',
						blobName: 'container/blob-uuid',
						fileName: 'virus-file-2.ext',
						scanStatus: 'fail'
					},
					{
						id: 'doc-3',
						caseId: 'case-123',
						folderId: 'folder-1',
						blobName: 'container/blob-uuid',
						fileName: 'virus-file-3.ext',
						scanStatus: 'pending'
					},
					{
						id: 'doc-4',
						caseId: 'case-123',
						folderId: 'folder-1',
						blobName: 'container/blob-uuid',
						fileName: 'virus-file-bad-data.ext',
						scanStatus: 'not-a-real-status'
					},
					{
						id: 'doc-5',
						caseId: 'case-123',
						folderId: 'folder-1',
						blobName: 'container/blob-uuid',
						fileName: 'virus-file-undefined.ext',
						scanStatus: undefined
					},
					{
						id: 'doc-6',
						caseId: 'case-123',
						folderId: 'folder-1',
						blobName: 'container/blob-uuid',
						fileName: 'file-name.ext',
						scanStatus: 'pass'
					}
				])
			);

			const req = mockReq({
				params: {},
				body: {
					selectedFiles: ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5', 'doc-6'],
					caseId: 'wrong-case',
					returnUrl: 'https://example.com'
				},
				session: {}
			});
			const res = mockRes();

			await buildDownloadDocument(service as any)(req, res);

			assert.deepStrictEqual(mockDb.document.findMany.mock.calls[0].arguments[0].where.id.in, [
				'doc-1',
				'doc-2',
				'doc-3',
				'doc-4',
				'doc-5',
				'doc-6'
			]);
			assert.deepStrictEqual(readSessionData(req, 'case-123', 'filesErrors', [], 'folder'), [
				{
					html:
						'<p class="govuk-body">Scan failed for files in this folder:</p>' +
						'<ul class="govuk-list govuk-list--bullet"><li>virus-file-1.ext</li><li>virus-file-2.ext</li><li>virus-file-3.ext</li><li>virus-file-bad-data.ext</li><li>virus-file-undefined.ext</li></ul>' +
						'<p class="govuk-body">These files cannot be downloaded.</p>',
					href: '#'
				}
			]);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/case-123/case-folders/folder-1/my-folder');
			assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 0);
			assert.strictEqual(service.createZipArchive.mock.callCount(), 0);
			assert.strictEqual(res.setHeader.mock.callCount(), 0);
			assert.strictEqual(service.audit.record.mock.callCount(), 0);
		});

		it('should redirect direct links to the document folder with a scan error', async () => {
			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([
					{
						id: 'doc-123',
						caseId: 'case-123',
						folderId: 'folder-1',
						Folder: { displayName: 'My Folder' },
						blobName: 'container/blob-uuid',
						fileName: 'virus-file.ext',
						scanStatus: 'fail'
					}
				])
			);

			// No caseId or returnUrl in the body
			const req = mockReq({ session: {} });
			const res = mockRes();

			await buildDownloadDocument(service as any)(req, res);

			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/case-123/case-folders/folder-1/my-folder');
			assert.deepStrictEqual(readSessionData(req, 'case-123', 'filesErrors', [], 'folder'), [
				{
					html:
						'<p class="govuk-body">Scan failed for files in this folder:</p>' +
						'<ul class="govuk-list govuk-list--bullet"><li>virus-file.ext</li></ul>' +
						'<p class="govuk-body">These files cannot be downloaded.</p>',
					href: '#'
				}
			]);

			assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 0);
			assert.strictEqual(res.setHeader.mock.callCount(), 0);
			assert.strictEqual(service.audit.record.mock.callCount(), 0);
		});

		it('should escape HTML characters in filenames listed in the scan error', async () => {
			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([
					{
						id: 'doc-123',
						caseId: 'case-123',
						folderId: 'folder-1',
						Folder: { displayName: 'My Folder' },
						blobName: 'container/blob-uuid',
						fileName: 'file<b>&.pdf',
						scanStatus: 'fail'
					}
				])
			);

			const req = mockReq({
				body: { caseId: 'case-123', returnUrl: '/cases/case-123/folder' },
				session: {}
			});
			const res = mockRes();

			await buildDownloadDocument(service as any)(req, res);

			assert.deepStrictEqual(readSessionData(req, 'case-123', 'filesErrors', [], 'folder'), [
				{
					html:
						'<p class="govuk-body">Scan failed for files in this folder:</p>' +
						'<ul class="govuk-list govuk-list--bullet"><li>file&lt;b&gt;&amp;.pdf</li></ul>' +
						'<p class="govuk-body">These files cannot be downloaded.</p>',
					href: '#'
				}
			]);
		});

		for (const secondDocument of [
			{ caseId: 'other-case', folderId: 'folder-1' },
			{ caseId: 'case-123', folderId: 'other-folder' }
		]) {
			it(`should reject documents from different cases or folders: ${JSON.stringify(secondDocument)}`, async () => {
				mockDb.document.findMany.mock.mockImplementation(() =>
					Promise.resolve([
						{ id: 'doc-1', caseId: 'case-123', folderId: 'folder-1', scanStatus: 'pass' },
						{ id: 'doc-2', ...secondDocument, scanStatus: 'fail' }
					])
				);
				const req = mockReq({ params: {}, body: { selectedFiles: ['doc-1', 'doc-2'] }, session: {} });
				const res = mockRes();

				await assert.rejects(() => buildDownloadDocument(service as any)(req, res), {
					message: 'Selected documents must belong to the same case and folder'
				});
				assert.strictEqual(res.redirect.mock.callCount(), 0);
				assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 0);
			});
		}
	});

	describe('Metadata Retrieval (Stage 1)', () => {
		it('should stop and return undefined if DB returns [] (Documents not found)', async () => {
			const req = mockReq();
			const res = mockRes();

			mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve([]));

			await assert.rejects(() => buildDownloadDocument(service as any)(req, res), {
				message: 'No documents found for provided ids'
			});

			assert.strictEqual(mockBlobStore.downloadBlob.mock.callCount(), 0);
		});

		it('should handle DB errors via wrapPrismaError', async () => {
			const req = mockReq();
			const res = mockRes();
			const dbError = new Error('DB Connection Failed');

			mockDb.document.findMany.mock.mockImplementation(() => Promise.reject(dbError));

			await assert.rejects(() => buildDownloadDocument(service as any)(req, res), dbError);
		});
	});

	describe('Blob Streaming (Stage 2 & 3)', () => {
		const validDocument = {
			id: 'doc-123',
			blobName: 'container/blob-uuid',
			fileName: 'test-file.pdf',
			scanStatus: 'pass'
		};

		const setupSuccessPath = () => {
			mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve([validDocument]));
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

			assert.strictEqual(mockDb.document.findMany.mock.callCount(), 1);

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
			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([
					{
						...validDocument,
						fileName: 'tést @ file.pdf'
					}
				])
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
		const validDocument = { id: 'doc-123', blobName: 'blob', fileName: 'file.pdf', scanStatus: 'pass' };

		beforeEach(() => {
			mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve([validDocument]));
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

			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([
					{
						id: 'doc-123',
						caseId: 'case-1',
						blobName: 'container/blob-uuid',
						fileName: 'report.pdf',
						scanStatus: 'pass'
					}
				])
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

			res.on.mock.mockImplementation((event: string, cb: Function) => {
				if (event === 'finish') finishCallback = cb;
			});

			await buildDownloadDocument(service as any)(req, res);

			await finishCallback!();
			assert.strictEqual(recordedAudit.caseId, 'case-1');
			assert.strictEqual(recordedAudit.action, 'FILE_DOWNLOADED');
			assert.strictEqual(recordedAudit.userId, 'user-999');
		});
	});
	describe('Bulk Zip Download', () => {
		const validDocuments = [
			{
				id: 'doc-1',
				caseId: 'case-1',
				folderId: 'folder-1',
				blobName: 'blob-uuid-1',
				fileName: 'test-1.pdf',
				scanStatus: 'pass',
				Case: { reference: 'test/123' }
			},
			{
				id: 'doc-2',
				caseId: 'case-1',
				folderId: 'folder-1',
				blobName: 'blob-uuid-2',
				fileName: 'test-2.jpg',
				scanStatus: 'pass',
				Case: { reference: 'test/123/123' }
			}
		];

		beforeEach(() => {
			mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve(validDocuments));
			mockBlobStore.downloadBlob.mock.mockImplementation(() => Promise.resolve({ readableStreamBody: mockBlobStream }));
		});

		it('should fetch all blobs and pipe a zip stream to the response', async () => {
			const req = mockReq({ body: { selectedFiles: ['doc-1', 'doc-2'] }, params: {} });
			const res = mockRes();

			await buildDownloadDocument(service as unknown as ManageService)(req, res);

			assert.strictEqual(mockDb.document.findMany.mock.callCount(), 1);
			const whereClause = mockDb.document.findMany.mock.calls[0].arguments[0].where;
			assert.deepStrictEqual(whereClause.id.in, ['doc-1', 'doc-2']);

			assert.strictEqual(service.createZipArchive.mock.callCount(), 1);
			assert.strictEqual(mockArchiveInstance.append.mock.callCount(), 2);
			assert.strictEqual(mockArchiveInstance.finalize.mock.callCount(), 1);

			assert.strictEqual(mockArchiveInstance.append.mock.calls[0].arguments[1].name, 'test-1.pdf');
			assert.strictEqual(mockArchiveInstance.append.mock.calls[1].arguments[1].name, 'test-2.jpg');

			const today = new Date().toISOString().split('T')[0];

			const expectedFilename = `test-123-bulk-download-${today}.zip`;

			const setHeaderCalls = res.setHeader.mock.calls;
			const dispositionHeader = setHeaderCalls.find((c: any) => c.arguments[0] === 'Content-Disposition');

			assert.strictEqual(dispositionHeader.arguments[1], `attachment; filename="${expectedFilename}"`);
		});

		it('should continue zipping if one blob fails to download', async () => {
			let callCount = 0;
			mockBlobStore.downloadBlob.mock.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// Fail first azure blob stream
					return Promise.reject(new Error('Azure Error'));
				}
				// Succeed the second
				return Promise.resolve({ readableStreamBody: mockBlobStream });
			});

			const req = mockReq({ body: { selectedFiles: ['doc-1', 'doc-2'] }, params: {} });
			const res = mockRes();

			await buildDownloadDocument(service as unknown as ManageService)(req, res);

			assert.strictEqual(mockLogger.error.mock.callCount(), 1);
			assert.strictEqual(mockArchiveInstance.append.mock.callCount(), 1);
			assert.strictEqual(mockArchiveInstance.finalize.mock.callCount(), 1);
		});
	});
});
