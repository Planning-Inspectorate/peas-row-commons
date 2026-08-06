import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
	buildPreloadCaseNoteData,
	buildViewEditCaseNote,
	buildUpdateCaseNote,
	buildCreateCaseNote,
	buildViewCaseNotes
} from './controller.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';
import { AUDIT_ACTIONS } from '../../../audit/actions.ts';

describe('Case Notes Controller', () => {
	const createMockDb = () => ({
		caseNote: {
			findUnique: mock.fn() as any,
			update: mock.fn() as any,
			updateMany: mock.fn() as any,
			create: mock.fn() as any
		},
		case: {
			findUnique: mock.fn() as any
		},
		$transaction: mock.fn() as any
	});

	const createMockAudit = () => ({
		record: mock.fn(() => Promise.resolve()) as any
	});

	const newMockRes = (locals = {}) => ({
		render: mock.fn(),
		redirect: mock.fn(),
		status: mock.fn(() => ({ send: mock.fn() })),
		locals
	});

	const mockNext = mock.fn() as any;

	describe('buildPreloadCaseNoteData', () => {
		it('should throw if id param is missing', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const mockService = { db: mockDb, logger } as any;

			const handler = buildPreloadCaseNoteData(mockService);
			const req = { params: {}, session: {} };
			const res = newMockRes();

			await assert.rejects(() => handler(req as any, res as any, mockNext), /id must be a single string value/);
		});

		it('should throw if noteId param is missing', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const mockService = { db: mockDb, logger } as any;

			const handler = buildPreloadCaseNoteData(mockService);
			const req = { params: { id: 'case-123' }, session: {} };
			const res = newMockRes();

			await assert.rejects(() => handler(req as any, res as any, mockNext), /noteId must be a single string value/);
		});

		it('should return 404 when case note is not found', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const mockService = { db: mockDb, logger } as any;

			mockDb.caseNote.findUnique.mock.mockImplementationOnce(() => Promise.resolve(null));
			mockDb.case.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({ id: 'case-123', reference: 'REF-001' })
			);

			const handler = buildPreloadCaseNoteData(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				session: {}
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			// notFoundHandler renders a 404 page
			assert.strictEqual(res.render.mock.callCount(), 1);
			const renderCall = res.render.mock.calls[0];
			assert.ok(!renderCall.arguments[0].includes('edit.njk'), 'Should not render edit page');
			assert.strictEqual(mockNext.mock.callCount(), 0, 'Should not call next()');
		});

		it('should return 404 when case is not found', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const mockService = { db: mockDb, logger } as any;

			mockDb.caseNote.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({ id: 'note-456', caseId: 'case-123', comment: 'Test note', Author: {} })
			);
			mockDb.case.findUnique.mock.mockImplementationOnce(() => Promise.resolve(null));

			const handler = buildPreloadCaseNoteData(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				session: {}
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const renderCall = res.render.mock.calls[0];
			assert.ok(!renderCall.arguments[0].includes('edit.njk'), 'Should not render edit page');
			assert.strictEqual(mockNext.mock.callCount(), 0, 'Should not call next()');
		});

		it('should return 404 when note does not belong to the case (case/note mismatch)', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const mockService = { db: mockDb, logger } as any;

			// Note belongs to a different case
			mockDb.caseNote.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({
					id: 'note-456',
					caseId: 'different-case-id', // Note belongs to different case
					comment: 'Test note',
					Author: {}
				})
			);
			mockDb.case.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({ id: 'case-123', reference: 'REF-001' })
			);

			const handler = buildPreloadCaseNoteData(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				session: {}
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const renderCall = res.render.mock.calls[0];
			assert.ok(!renderCall.arguments[0].includes('edit.njk'), 'Should not render edit page when note/case mismatch');
			assert.strictEqual(mockNext.mock.callCount(), 0, 'Should not call next()');
		});

		it('should populate res.locals and call next() when note belongs to the case', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const mockService = { db: mockDb, logger } as any;

			const mockCaseNote = {
				id: 'note-456',
				caseId: 'case-123',
				comment: 'Test note content',
				Author: { id: 'author-1' }
			};
			const mockCase = { id: 'case-123', reference: 'REF-001' };

			mockDb.caseNote.findUnique.mock.mockImplementationOnce(() => Promise.resolve(mockCaseNote));
			mockDb.case.findUnique.mock.mockImplementationOnce(() => Promise.resolve(mockCase));

			const handler = buildPreloadCaseNoteData(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				session: {}
			};
			const res = newMockRes();
			const next = mock.fn();

			await handler(req as any, res as any, next);

			// Should not render 404
			assert.strictEqual(res.render.mock.callCount(), 0);

			// Should populate res.locals
			assert.strictEqual((res.locals as any).reference, 'REF-001');
			assert.deepStrictEqual((res.locals as any).caseNote, mockCaseNote);

			// Should call next()
			assert.strictEqual(next.mock.callCount(), 1);
		});
	});

	describe('buildViewEditCaseNote', () => {
		it('should throw if id param is missing', async () => {
			const handler = buildViewEditCaseNote();
			const req = { params: {}, session: {} };
			const res = newMockRes({ reference: 'REF-001', caseNote: { comment: 'Test' } });

			await assert.rejects(() => handler(req as any, res as any, mockNext), /id must be a single string value/);
		});

		it('should render edit page with data from res.locals', async () => {
			const handler = buildViewEditCaseNote();
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				originalUrl: '/cases/case-123/case-notes/note-456/edit',
				session: {}
			};
			const res = newMockRes({
				reference: 'REF-001',
				caseNote: { id: 'note-456', caseId: 'case-123', comment: 'Test note content' }
			});

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const renderCall = res.render.mock.calls[0];
			assert.strictEqual(renderCall.arguments[0], 'views/cases/case-notes/edit.njk');
			assert.strictEqual(renderCall.arguments[1].pageHeading, 'Change note');
			assert.strictEqual(renderCall.arguments[1].reference, 'REF-001');
			assert.strictEqual(renderCall.arguments[1].comment, 'Test note content');
			assert.strictEqual(renderCall.arguments[1].backLinkUrl, '/cases/case-123');
		});

		it('should prefer body comment over note comment when re-rendering after validation error', async () => {
			const handler = buildViewEditCaseNote();
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'User entered comment' },
				originalUrl: '/cases/case-123/case-notes/note-456/edit',
				session: {}
			};
			const res = newMockRes({
				reference: 'REF-001',
				caseNote: { id: 'note-456', caseId: 'case-123', comment: 'Original note content' }
			});

			await handler(req as any, res as any, mockNext);

			const renderCall = res.render.mock.calls[0];
			assert.strictEqual(renderCall.arguments[1].comment, 'User entered comment');
		});
	});

	describe('buildUpdateCaseNote', () => {
		let mockTimers: typeof mock.timers;
		const frozenTime = new Date('2026-08-05T12:00:00.000Z').getTime();

		beforeEach(() => {
			mockTimers = mock.timers;
			mockTimers.enable({ apis: ['Date'] });
			mockTimers.setTime(frozenTime);
		});

		afterEach(() => {
			mockTimers.reset();
		});

		it('should throw if id param is missing', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			const handler = buildUpdateCaseNote(mockService);
			const req = { params: {}, body: { comment: 'Updated comment' }, session: {} };
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'case-123' } });

			await assert.rejects(() => handler(req as any, res as any, mockNext), /id must be a single string value/);
		});

		it('should throw if noteId param is missing', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			const handler = buildUpdateCaseNote(mockService);
			const req = { params: { id: 'case-123' }, body: { comment: 'Updated comment' }, session: {} };
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'case-123' } });

			await assert.rejects(() => handler(req as any, res as any, mockNext), /noteId must be a single string value/);
		});

		it('should update case note with correct data and updatedAt timestamp', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.caseNote.updateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 1 }));

			const handler = buildUpdateCaseNote(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'Updated comment' },
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'case-123' } });

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(mockDb.caseNote.updateMany.mock.callCount(), 1);
			const updateCall = mockDb.caseNote.updateMany.mock.calls[0];
			const updateArgs = updateCall.arguments[0];

			assert.deepStrictEqual(updateArgs.where, { id: 'note-456', caseId: 'case-123' });
			assert.strictEqual(updateArgs.data.comment, 'Updated comment');
			assert.strictEqual(updateArgs.data.updatedAt.getTime(), frozenTime);
		});

		it('should record audit with CASE_NOTE_UPDATED action and correct metadata', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.caseNote.updateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 1 }));

			const handler = buildUpdateCaseNote(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'Audit test comment' },
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'case-123', comment: 'Original comment' } });

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(audit.record.mock.callCount(), 1);
			const auditCall = audit.record.mock.calls[0];
			const auditArgs = auditCall.arguments[0] as any;

			assert.strictEqual(auditArgs.caseId, 'case-123');
			assert.strictEqual(auditArgs.action, AUDIT_ACTIONS.CASE_NOTE_UPDATED);
			assert.strictEqual(auditArgs.userId, 'user-789');
			assert.deepStrictEqual(auditArgs.metadata, { oldValue: 'Original comment', newValue: 'Audit test comment' });
		});

		it('should redirect to case view page after successful update', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.caseNote.updateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 1 }));

			const handler = buildUpdateCaseNote(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'Updated comment' },
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'case-123' } });

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['/cases/case-123']);
		});

		it('should log info messages before and after update', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.caseNote.updateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 1 }));

			const handler = buildUpdateCaseNote(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'Updated comment' },
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'case-123' } });

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(logger.info.mock.callCount(), 2);

			const firstInfoCall = logger.info.mock.calls[0];
			assert.deepStrictEqual(firstInfoCall.arguments[0], { noteId: 'note-456', caseId: 'case-123' });
			assert.strictEqual(firstInfoCall.arguments[1], 'case note update');

			const secondInfoCall = logger.info.mock.calls[1];
			assert.deepStrictEqual(secondInfoCall.arguments[0], { caseId: 'case-123', noteId: 'note-456' });
			assert.strictEqual(secondInfoCall.arguments[1], 'case note updated');
		});

		it('should rethrow database errors after logging (wrapPrismaError behavior)', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			const dbError = new Error('Database connection failed');
			mockDb.caseNote.updateMany.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const handler = buildUpdateCaseNote(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'Updated comment' },
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'case-123' } });

			// wrapPrismaError rethrows all errors, so this should reject
			await assert.rejects(() => handler(req as any, res as any, mockNext), /Database connection failed/);

			assert.strictEqual(audit.record.mock.callCount(), 0, 'Audit should not be recorded since error was thrown');
			assert.strictEqual(res.redirect.mock.callCount(), 0, 'Redirect should not happen since error was thrown');
		});

		it('should handle undefined userId from session', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.caseNote.updateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 1 }));

			const handler = buildUpdateCaseNote(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'Updated comment' },
				session: {} // No account/localAccountId
			};
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'case-123' } });

			await handler(req as any, res as any, mockNext);

			const auditCall = audit.record.mock.calls[0];
			assert.strictEqual((auditCall.arguments[0] as any).userId, undefined);
		});

		it('should return 404 when note does not belong to the case (defence in depth)', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			const handler = buildUpdateCaseNote(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'Updated comment' },
				session: { account: { localAccountId: 'user-789' } }
			};
			// Note belongs to a different case
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'different-case-id' } });

			await handler(req as any, res as any, mockNext);

			// notFoundHandler renders views/layouts/error
			assert.strictEqual(res.render.mock.callCount(), 1);
			const renderCall = res.render.mock.calls[0];
			assert.strictEqual(renderCall.arguments[0], 'views/layouts/error', 'Should render error page');

			// Should not attempt to update or audit
			assert.strictEqual(mockDb.caseNote.updateMany.mock.callCount(), 0, 'Should not call updateMany');
			assert.strictEqual(audit.record.mock.callCount(), 0, 'Should not record audit');
		});

		it('should return 404 when caseNote is missing from res.locals', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			const handler = buildUpdateCaseNote(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'Updated comment' },
				session: { account: { localAccountId: 'user-789' } }
			};
			// No caseNote in res.locals
			const res = newMockRes({});

			await handler(req as any, res as any, mockNext);

			// notFoundHandler renders a 404 page
			assert.strictEqual(res.render.mock.callCount(), 1);

			// Should not attempt to update or audit
			assert.strictEqual(mockDb.caseNote.updateMany.mock.callCount(), 0, 'Should not call updateMany');
			assert.strictEqual(audit.record.mock.callCount(), 0, 'Should not record audit');
		});

		it('should throw error when updateMany affects 0 rows', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			// No rows affected (could indicate tampering or race condition)
			mockDb.caseNote.updateMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 0 }));

			const handler = buildUpdateCaseNote(mockService);
			const req = {
				params: { id: 'case-123', noteId: 'note-456' },
				body: { comment: 'Updated comment' },
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes({ caseNote: { id: 'note-456', caseId: 'case-123' } });

			await assert.rejects(
				() => handler(req as any, res as any, mockNext),
				/Expected 1 row to be updated, but 0 rows were affected/
			);

			assert.strictEqual(audit.record.mock.callCount(), 0, 'Audit should not be recorded');
		});
	});

	describe('buildCreateCaseNote', () => {
		it('should throw if id param is missing', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			const handler = buildCreateCaseNote(mockService);
			const req = { params: {}, body: { comment: 'New comment' }, session: {} };
			const res = newMockRes();

			await assert.rejects(() => handler(req as any, res as any, mockNext), /id must be a single string value/);
		});

		it('should create case note via transaction and redirect to case view', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			// Mock transaction to execute the callback
			mockDb.$transaction.mock.mockImplementationOnce(async (callback: any) => {
				const $tx = {
					case: {
						findUnique: mock.fn(() => Promise.resolve({ id: 'case-123' }))
					},
					caseNote: {
						create: mock.fn(() => Promise.resolve({ id: 'new-note-1' }))
					}
				};
				return callback($tx);
			});

			const handler = buildCreateCaseNote(mockService);
			const req = {
				params: { id: 'case-123' },
				body: { comment: 'New case note' },
				baseUrl: '/cases/case-123/case-notes',
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['/cases/case-123']);
		});

		it('should record audit with CASE_NOTE_ADDED action', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.$transaction.mock.mockImplementationOnce(async (callback: any) => {
				const $tx = {
					case: {
						findUnique: mock.fn(() => Promise.resolve({ id: 'case-123' }))
					},
					caseNote: {
						create: mock.fn(() => Promise.resolve({ id: 'new-note-1' }))
					}
				};
				return callback($tx);
			});

			const handler = buildCreateCaseNote(mockService);
			const req = {
				params: { id: 'case-123' },
				body: { comment: 'Audited note' },
				baseUrl: '/cases/case-123/case-notes',
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(audit.record.mock.callCount(), 1);
			const auditCall = audit.record.mock.calls[0];
			const auditArgs = auditCall.arguments[0] as any;

			assert.strictEqual(auditArgs.caseId, 'case-123');
			assert.strictEqual(auditArgs.action, AUDIT_ACTIONS.CASE_NOTE_ADDED);
			assert.strictEqual(auditArgs.userId, 'user-789');
			assert.deepStrictEqual(auditArgs.metadata, { caseNote: 'Audited note' });
		});

		it('should log info messages for creation', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.$transaction.mock.mockImplementationOnce(async (callback: any) => {
				const $tx = {
					case: {
						findUnique: mock.fn(() => Promise.resolve({ id: 'case-123' }))
					},
					caseNote: {
						create: mock.fn(() => Promise.resolve({ id: 'new-note-1' }))
					}
				};
				return callback($tx);
			});

			const handler = buildCreateCaseNote(mockService);
			const req = {
				params: { id: 'case-123' },
				body: { comment: 'Log test note' },
				baseUrl: '/cases/case-123/case-notes',
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(logger.info.mock.callCount(), 2);

			const firstInfoCall = logger.info.mock.calls[0];
			assert.deepStrictEqual(firstInfoCall.arguments[0], { comment: 'Log test note' });
			assert.strictEqual(firstInfoCall.arguments[1], 'case note creation');

			const secondInfoCall = logger.info.mock.calls[1];
			assert.deepStrictEqual(secondInfoCall.arguments[0], { id: 'case-123' });
			assert.strictEqual(secondInfoCall.arguments[1], 'case note created');
		});

		it('should throw error when case is not found in transaction', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.$transaction.mock.mockImplementationOnce(async (callback: any) => {
				const $tx = {
					case: {
						findUnique: mock.fn(() => Promise.resolve(null)) // Case not found
					},
					caseNote: {
						create: mock.fn()
					}
				};
				return callback($tx);
			});

			const handler = buildCreateCaseNote(mockService);
			const req = {
				params: { id: 'nonexistent-case' },
				body: { comment: 'New note' },
				baseUrl: '/cases/nonexistent-case/case-notes',
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes();

			await assert.rejects(() => handler(req as any, res as any, mockNext), /Case not found/);

			assert.strictEqual(audit.record.mock.callCount(), 0, 'Audit should not be recorded');
		});

		it('should handle undefined userId from session', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.$transaction.mock.mockImplementationOnce(async (callback: any) => {
				const $tx = {
					case: {
						findUnique: mock.fn(() => Promise.resolve({ id: 'case-123' }))
					},
					caseNote: {
						create: mock.fn(() => Promise.resolve({ id: 'new-note-1' }))
					}
				};
				return callback($tx);
			});

			const handler = buildCreateCaseNote(mockService);
			const req = {
				params: { id: 'case-123' },
				body: { comment: 'Note without user' },
				baseUrl: '/cases/case-123/case-notes',
				session: {} // No account/localAccountId
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			const auditCall = audit.record.mock.calls[0];
			assert.strictEqual((auditCall.arguments[0] as any).userId, undefined);
		});

		it('should properly strip /case-notes from baseUrl to get viewCaseUrl', async () => {
			const mockDb = createMockDb();
			const logger = mockLogger();
			const audit = createMockAudit();
			const mockService = { db: mockDb, logger, audit } as any;

			mockDb.$transaction.mock.mockImplementationOnce(async (callback: any) => {
				const $tx = {
					case: {
						findUnique: mock.fn(() => Promise.resolve({ id: 'case-abc' }))
					},
					caseNote: {
						create: mock.fn(() => Promise.resolve({ id: 'new-note-1' }))
					}
				};
				return callback($tx);
			});

			const handler = buildCreateCaseNote(mockService);
			const req = {
				params: { id: 'case-abc' },
				body: { comment: 'Test redirect URL' },
				baseUrl: '/cases/case-abc/case-notes/',
				session: { account: { localAccountId: 'user-789' } }
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['/cases/case-abc']);
		});
	});

	describe('buildViewCaseNotes', () => {
		const createMockService = (dbOverrides = {}) => {
			const mockDb = {
				case: {
					findUnique: mock.fn() as any
				},
				...dbOverrides
			};
			return {
				db: mockDb,
				logger: mockLogger(),
				entraGroupIds: {
					allUsers: 'group-all',
					inspectors: 'group-insp',
					caseOfficers: 'group-co'
				},
				getEntraClient: () => ({
					listAllGroupMembers: mock.fn(() =>
						Promise.resolve([
							{ id: 'user-1', displayName: 'Test User One' },
							{ id: 'user-2', displayName: 'Test User Two' }
						])
					)
				})
			} as any;
		};

		it('should throw if id param is missing', async () => {
			const mockService = createMockService();
			const handler = buildViewCaseNotes(mockService);
			const req = { params: {}, session: {} };
			const res = newMockRes();

			await assert.rejects(() => handler(req as any, res as any, mockNext), /id must be a single string value/);
		});

		it('should return 404 when case is not found', async () => {
			const mockService = createMockService();
			mockService.db.case.findUnique.mock.mockImplementationOnce(() => Promise.resolve(null));

			const handler = buildViewCaseNotes(mockService);
			const req = {
				params: { id: 'nonexistent-case' },
				session: {}
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const renderCall = res.render.mock.calls[0];
			assert.strictEqual(renderCall.arguments[0], 'views/layouts/error', 'Should render error page for 404');
		});

		it('should render case notes view with correct data', async () => {
			const mockService = createMockService();
			const mockCaseRow = {
				id: 'case-123',
				name: 'Test Case',
				reference: 'REF-001',
				Notes: [
					{
						id: 'note-1',
						comment: 'First note',
						createdAt: new Date('2026-01-15T10:00:00Z'),
						Author: { idpUserId: 'user-1' },
						NoteType: { id: 'case-note', name: 'Case Note' }
					},
					{
						id: 'note-2',
						comment: 'Second note',
						createdAt: new Date('2026-01-14T09:00:00Z'),
						Author: { idpUserId: 'user-2' },
						NoteType: { id: 'case-note', name: 'Case Note' }
					}
				]
			};
			mockService.db.case.findUnique.mock.mockImplementationOnce(() => Promise.resolve(mockCaseRow));

			const handler = buildViewCaseNotes(mockService);
			const req = {
				params: { id: 'case-123' },
				originalUrl: '/cases/case-123/case-notes',
				session: {}
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const renderCall = res.render.mock.calls[0];

			assert.strictEqual(renderCall.arguments[0], 'views/cases/case-notes/view.njk');

			const renderData = renderCall.arguments[1];
			assert.strictEqual(renderData.pageHeading, 'Case notes');
			assert.strictEqual(renderData.reference, 'REF-001');
			assert.strictEqual(renderData.backLinkUrl, '/cases/case-123');
			assert.strictEqual(renderData.backLinkText, 'Back to case details');
			assert.strictEqual(renderData.currentUrl, '/cases/case-123/case-notes');
		});

		it('should handle case with no notes', async () => {
			const mockService = createMockService();
			const mockCaseRow = {
				id: 'case-123',
				name: 'Empty Case',
				reference: 'REF-002',
				Notes: []
			};
			mockService.db.case.findUnique.mock.mockImplementationOnce(() => Promise.resolve(mockCaseRow));

			const handler = buildViewCaseNotes(mockService);
			const req = {
				params: { id: 'case-123' },
				originalUrl: '/cases/case-123/case-notes',
				session: {}
			};
			const res = newMockRes();

			await handler(req as any, res as any, mockNext);

			assert.strictEqual(res.render.mock.callCount(), 1);
			const renderCall = res.render.mock.calls[0];
			assert.strictEqual(renderCall.arguments[0], 'views/cases/case-notes/view.njk');
		});

		it('should rethrow database errors after logging (wrapPrismaError behavior)', async () => {
			const mockService = createMockService();
			const dbError = new Error('Database connection failed');
			mockService.db.case.findUnique.mock.mockImplementationOnce(() => Promise.reject(dbError));

			const handler = buildViewCaseNotes(mockService);
			const req = {
				params: { id: 'case-123' },
				originalUrl: '/cases/case-123/case-notes',
				session: {}
			};
			const res = newMockRes();

			await assert.rejects(() => handler(req as any, res as any, mockNext), /Database connection failed/);

			assert.strictEqual(res.render.mock.callCount(), 0, 'Should not render view when DB error occurs');
		});
	});
});
