import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentsController, createDocumentsFromDrafts } from './controller.ts';
import type { ManageService } from '#service';
import type { Response } from 'express';

describe('Create Documents Logic', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	};

	const mockReq = (overrides = {}) =>
		({
			params: { id: 'case-123', folderId: 'folder-123' },
			sessionID: 'session-abc',
			baseUrl: '/case-folders/case-123/folder-123/upload',
			originalUrl: '/original-url',
			session: {},
			...overrides
		}) as any;

	const mockRes = () => ({
		redirect: mock.fn()
	});

	describe('createDocumentsFromDrafts (Helper Function)', () => {
		it('should return { createdLength: 0, fileNames: [] } if no drafts are found', async () => {
			const req = mockReq();
			const db = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([]))
				}
			} as any;

			const result = await createDocumentsFromDrafts(req, db as any, mockLogger as any, 'case-1', 'folder-1');

			assert.deepStrictEqual(result, { createdLength: 0, fileNames: [] });
			assert.strictEqual(db.draftDocument.findMany.mock.callCount(), 1);
			assert.deepStrictEqual(db.draftDocument.findMany.mock.calls[0].arguments[0].where, {
				sessionKey: 'session-abc',
				caseId: 'case-1',
				folderId: 'folder-1'
			});
		});

		it('should commit documents via transaction and return count and fileNames', async () => {
			const req = mockReq();
			const drafts = [
				{ fileName: 'a.pdf', blobName: 'blob-a', size: 100 },
				{ fileName: 'b.pdf', blobName: 'blob-b', size: 200 }
			];

			const db = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve(drafts)),
					deleteMany: mock.fn()
				},
				document: {
					createMany: mock.fn()
				},
				$transaction: mock.fn(() => Promise.resolve())
			};

			const result = await createDocumentsFromDrafts(req, db as any, mockLogger as any, 'case-1', 'folder-1');

			assert.deepStrictEqual(result, { createdLength: 2, fileNames: ['a.pdf', 'b.pdf'] });
			assert.strictEqual(db.$transaction.mock.callCount(), 1);

			const createCall = db.document.createMany.mock.calls[0].arguments[0];
			assert.strictEqual(createCall.data.length, 2);
			assert.strictEqual(createCall.data[0].fileName, 'a.pdf');

			const deleteCall = db.draftDocument.deleteMany.mock.calls[0].arguments[0];
			assert.strictEqual(deleteCall.where.sessionKey, 'session-abc');
		});

		it('should throw and log error if DB transaction fails', async () => {
			const req = mockReq();
			const db = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([{ fileName: 'test.pdf' }])),
					deleteMany: mock.fn()
				},
				document: { createMany: mock.fn() },
				$transaction: mock.fn(() => Promise.reject(new Error('DB Error')))
			};

			await assert.rejects(() => createDocumentsFromDrafts(req, db as any, mockLogger as any, 'case-1', 'folder-1'), {
				message: 'DB Error'
			});
		});
	});

	describe('createDocumentsController', () => {
		it('should handle missing params by redirecting and setting a generic error in session', async () => {
			const req = mockReq({ params: { id: 'case-1' } });
			const res = mockRes();
			const service = {
				db: {},
				logger: mockLogger,
				audit: { record: mock.fn(() => Promise.resolve()) }
			} as unknown as ManageService;

			const controller = createDocumentsController(service);

			await controller(req, res as unknown as Response);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/original-url');

			assert.ok(req.session.files['case-1'].uploadErrors);
			assert.strictEqual(
				req.session.files['case-1'].uploadErrors[0].text,
				'There was a problem saving your documents. Please try again.'
			);
		});

		it('should catch NoUploadsError if 0 documents are created and set specific error message', async () => {
			const db = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([])),
					deleteMany: mock.fn()
				},
				document: { createMany: mock.fn() },
				$transaction: mock.fn(() => Promise.resolve())
			};

			const service = {
				db,
				logger: mockLogger,
				audit: { record: mock.fn(() => Promise.resolve()) }
			} as unknown as ManageService;
			const req = mockReq();
			const res = mockRes();

			const controller = createDocumentsController(service);
			await controller(req, res as unknown as Response);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/original-url');

			assert.ok(req.session.files['case-123'].uploadErrors);
			assert.strictEqual(req.session.files['case-123'].uploadErrors[0].text, 'Select a file to upload');
		});

		it('should succeed: redirect to parent folder and set success session data', async () => {
			const db = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([{ fileName: 'doc.pdf' }])),
					deleteMany: mock.fn()
				},
				document: { createMany: mock.fn() },
				folder: {
					findUnique: mock.fn(() => Promise.resolve({ displayName: 'Evidence' }))
				},
				$transaction: mock.fn(() => Promise.resolve())
			};

			const mockAudit = { record: mock.fn(() => Promise.resolve()) };

			const service = {
				db,
				logger: mockLogger,
				audit: mockAudit
			} as unknown as ManageService;
			const req = mockReq({
				session: { account: { localAccountId: 'user-1' } }
			});
			const res = mockRes();

			const controller = createDocumentsController(service);
			await controller(req, res as unknown as Response);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/case-folders/case-123/folder-123');

			assert.deepStrictEqual(req.session.folder['folder-123'], { updated: true });

			// Verify single-file audit was recorded
			assert.strictEqual(mockAudit.record.mock.callCount(), 1);
			const auditCall = (mockAudit.record.mock.calls[0] as any).arguments[0];
			assert.strictEqual(auditCall.action, 'FILE_UPLOADED');
			assert.strictEqual(auditCall.metadata.fileName, 'doc.pdf');
			assert.strictEqual(auditCall.metadata.folderName, 'Evidence');
		});

		it('should fail: redirect to original URL and set generic error session data for system errors', async () => {
			const db = {
				draftDocument: {
					findMany: mock.fn(() => Promise.reject(new Error('Transaction Failed')))
				}
			};

			const service = {
				db,
				logger: mockLogger,
				audit: { record: mock.fn(() => Promise.resolve()) }
			} as unknown as ManageService;
			const req = mockReq();
			const res = mockRes();

			const controller = createDocumentsController(service);
			await controller(req, res as unknown as Response);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/original-url');

			assert.ok(req.session.files['case-123'].uploadErrors);
			assert.strictEqual(
				req.session.files['case-123'].uploadErrors[0].text,
				'There was a problem saving your documents. Please try again.'
			);
		});
	});
});
