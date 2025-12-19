import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentsController, createDocumentsFromDrafts } from './controller.ts';

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
		it('should return 0 if no drafts are found', async () => {
			const req = mockReq();
			const db = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([]))
				}
			} as any;

			const result = await createDocumentsFromDrafts(req, db as any, mockLogger as any, 'case-1', 'folder-1');

			assert.strictEqual(result, 0);
			assert.strictEqual(db.draftDocument.findMany.mock.callCount(), 1);
			assert.deepStrictEqual(db.draftDocument.findMany.mock.calls[0].arguments[0].where, {
				sessionKey: 'session-abc',
				caseId: 'case-1',
				folderId: 'folder-1'
			});
		});

		it('should commit documents via transaction and return count', async () => {
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

			assert.strictEqual(result, 2);
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
		it('should throw error if required params are missing', async () => {
			const req = mockReq({ params: { id: 'case-1' } }); // No folder Id passed.
			const res = mockRes();
			const service = { db: {}, logger: mockLogger };

			const controller = createDocumentsController(service as any);

			await assert.rejects(() => controller(req as any, res as any), {
				message: 'Missing required parameters: id or folderId'
			});
		});

		it('should succeed: redirect to parent folder and set success session data', async () => {
			const db = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([{ fileName: 'doc.pdf' }])),
					deleteMany: mock.fn()
				},
				document: { createMany: mock.fn() },
				$transaction: mock.fn(() => Promise.resolve())
			};

			const service = { db, logger: mockLogger };
			const req = mockReq();
			const res = mockRes();

			const controller = createDocumentsController(service as any);
			await controller(req as any, res as any);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/case-folders/case-123/folder-123');

			assert.deepStrictEqual(req.session.folder['folder-123'], { updated: true });
		});

		it('should fail: redirect to original URL and set error session data', async () => {
			const db = {
				draftDocument: {
					findMany: mock.fn(() => Promise.reject(new Error('Transaction Failed')))
				}
			};

			const service = { db, logger: mockLogger };
			const req = mockReq();
			const res = mockRes();

			const controller = createDocumentsController(service as any);
			await controller(req as any, res as any);

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
