import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildLoadCaseData, validateRequestState, moveFilesTransaction, buildSaveController } from './controller.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';

describe('Move Files Controller', () => {
	let mockReq: any;
	let mockRes: any;
	let mockNext: any;
	let mockDb: any;
	let mockService: any;
	let recordedAudits: any[];

	beforeEach(() => {
		recordedAudits = [];

		mockReq = {
			params: { id: 'case-123' },
			session: {},
			locals: {}
		};

		mockRes = {
			locals: {},
			redirect: mock.fn(),
			status: mock.fn(() => ({ send: mock.fn() })),
			render: mock.fn()
		};

		mockNext = mock.fn();

		mockDb = {
			case: { findUnique: mock.fn() },
			folder: { findUnique: mock.fn() },
			document: {
				updateMany: mock.fn(),
				findMany: mock.fn(() => Promise.resolve([]))
			},
			$transaction: mock.fn(async (cb) => await cb(mockDb))
		};

		mockService = {
			db: mockDb,
			logger: mockLogger(),
			audit: {
				recordMany: (entries: any[]) => {
					recordedAudits.push(...entries);
					return Promise.resolve();
				}
			}
		};
	});

	describe('buildLoadCaseData', () => {
		it('should throw if id is missing', async () => {
			mockReq.params = {};
			const handler = buildLoadCaseData(mockService);

			await assert.rejects(() => handler(mockReq, mockRes, mockNext) as any, {
				message: 'id is required'
			});
		});

		it('should call next(error) if case is not found', async () => {
			mockDb.case.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			const handler = buildLoadCaseData(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockNext.mock.callCount(), 1);
			const error = mockNext.mock.calls[0].arguments[0];
			assert.strictEqual(error.message, 'Case not found');
		});

		it('should attach folderStructure to req and call next() on success', async () => {
			mockDb.case.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					id: 'case-123',
					Folders: [
						{ id: 'f1', displayName: 'Folder 1', parentFolderId: null },
						{ id: 'f2', displayName: 'Folder 2', parentFolderId: 'f1' }
					]
				})
			);

			const handler = buildLoadCaseData(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.ok(mockReq.folderStructure);
			assert.strictEqual(mockReq.folderStructure.length, 1);
			assert.strictEqual(mockReq.folderStructure[0].children.length, 1);

			assert.strictEqual(mockNext.mock.callCount(), 1);
			assert.strictEqual(mockNext.mock.calls[0].arguments.length, 0);
		});
	});

	describe('validateRequestState', () => {
		it('should throw if journeyResponse is missing', () => {
			assert.throws(() => {
				validateRequestState(mockReq, mockRes, 'case-1', 'journey-1', mockService.logger);
			}, /Valid journey response and answers object required/);
		});

		it('should redirect and clear session if no file IDs are in session', () => {
			mockRes.locals.journeyResponse = { answers: {} };
			mockReq.session.moveFilesIds = undefined;

			validateRequestState(mockReq, mockRes, 'case-1', 'journey-1', mockService.logger);

			assert.ok(mockService.logger.warn.mock.calls.length > 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/cases/case-1/case-folders');
		});

		it('should throw if no destination folder is selected in answers', () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: null } };
			mockReq.session.moveFilesIds = ['file-1'];

			assert.throws(() => {
				validateRequestState(mockReq, mockRes, 'case-1', 'journey-1', mockService.logger);
			}, /No destination folder selected/);
		});

		it('should return payload if state is valid', () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: 'folder-dest-1' } };
			mockReq.session.moveFilesIds = ['file-1', 'file-2'];

			const result = validateRequestState(mockReq, mockRes, 'case-1', 'journey-1', mockService.logger);

			assert.deepStrictEqual(result, {
				fileIds: ['file-1', 'file-2'],
				destinationFolderId: 'folder-dest-1'
			});
		});
	});

	describe('moveFilesTransaction', () => {
		it('should throw if target folder does not exist', async () => {
			mockDb.folder.findUnique.mock.mockImplementation(() => Promise.resolve(null));

			await assert.rejects(async () => {
				await moveFilesTransaction(mockDb, 'case-1', 'folder-x', ['file-1'], mockService.logger);
			}, /Target folder folder-x not found/);
		});

		it('should throw if target folder belongs to a different case', async () => {
			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					id: 'folder-x',
					caseId: 'DIFFERENT-CASE-ID'
				})
			);

			await assert.rejects(async () => {
				await moveFilesTransaction(mockDb, 'case-1', 'folder-x', ['file-1'], mockService.logger);
			}, /Target folder does not belong to the current case/);

			assert.strictEqual(mockService.logger.error.mock.callCount(), 1);
		});

		it('should update documents if validation passes', async () => {
			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					id: 'folder-x',
					caseId: 'case-1'
				})
			);
			mockDb.document.updateMany.mock.mockImplementation(() => Promise.resolve({ count: 2 }));

			await moveFilesTransaction(mockDb, 'case-1', 'folder-x', ['file-1', 'file-2'], mockService.logger);

			assert.strictEqual(mockDb.document.updateMany.mock.callCount(), 1);

			const args = mockDb.document.updateMany.mock.calls[0].arguments[0];
			assert.deepStrictEqual(args.where.id.in, ['file-1', 'file-2']);
			assert.strictEqual(args.where.caseId, 'case-1');
			assert.strictEqual(args.data.folderId, 'folder-x');
		});
	});

	describe('buildSaveController', () => {
		it('should successfully move files and redirect to the new folder url', async () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: 'dest-folder-id' } };
			mockReq.session.moveFilesIds = ['file-1'];

			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([{ id: 'file-1', fileName: 'report.pdf', Folder: { displayName: 'Old Folder' } }])
			);

			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					id: 'dest-folder-id',
					caseId: 'case-123',
					displayName: 'My New Folder'
				})
			);

			mockDb.document.updateMany.mock.mockImplementation(() => Promise.resolve({ count: 1 }));

			const handler = buildSaveController(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(mockReq.session.moveFilesIds, undefined);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			const redirectUrl = mockRes.redirect.mock.calls[0].arguments[0];
			assert.strictEqual(redirectUrl, '/cases/case-123/case-folders/dest-folder-id/my-new-folder');
		});

		it('should throw (bubbling up from wrapPrismaError) if target folder not found', async () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: 'dest-folder-id' } };
			mockReq.session.moveFilesIds = ['file-1'];

			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([{ id: 'file-1', fileName: 'report.pdf', Folder: { displayName: 'Old Folder' } }])
			);

			mockDb.folder.findUnique.mock.mockImplementationOnce(() =>
				Promise.resolve({ id: 'dest-folder-id', caseId: 'case-123' })
			);
			mockDb.folder.findUnique.mock.mockImplementationOnce(() => Promise.resolve(null));

			mockDb.document.updateMany.mock.mockImplementation(() => Promise.resolve({ count: 1 }));

			const handler = buildSaveController(mockService);

			await assert.rejects(async () => {
				await handler(mockReq, mockRes, mockNext);
			});

			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});

		it('should record an audit entry for each file moved', async () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: 'dest-folder-id' } };
			mockReq.session = {
				moveFilesIds: ['file-1', 'file-2'],
				account: { localAccountId: 'user-999' }
			};

			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([
					{ id: 'file-1', fileName: 'report.pdf', Folder: { displayName: 'Source A' } },
					{ id: 'file-2', fileName: 'invoice.pdf', Folder: { displayName: 'Source B' } }
				])
			);

			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					id: 'dest-folder-id',
					caseId: 'case-123',
					displayName: 'Destination Folder'
				})
			);

			mockDb.document.updateMany.mock.mockImplementation(() => Promise.resolve({ count: 2 }));

			const handler = buildSaveController(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(recordedAudits.length, 2);

			assert.strictEqual(recordedAudits[0].caseId, 'case-123');
			assert.strictEqual(recordedAudits[0].action, 'FILE_MOVED');
			assert.strictEqual(recordedAudits[0].userId, 'user-999');
			assert.strictEqual(recordedAudits[0].metadata.fileName, 'report.pdf');
			assert.strictEqual(recordedAudits[0].metadata.oldFolderName, 'Source A');
			assert.strictEqual(recordedAudits[0].metadata.folderName, 'Destination Folder');

			assert.strictEqual(recordedAudits[1].caseId, 'case-123');
			assert.strictEqual(recordedAudits[1].action, 'FILE_MOVED');
			assert.strictEqual(recordedAudits[1].metadata.fileName, 'invoice.pdf');
			assert.strictEqual(recordedAudits[1].metadata.oldFolderName, 'Source B');
			assert.strictEqual(recordedAudits[1].metadata.folderName, 'Destination Folder');
		});

		it('should use fallback dash when source folder name is missing', async () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: 'dest-folder-id' } };
			mockReq.session = {
				moveFilesIds: ['file-1'],
				account: { localAccountId: 'user-999' }
			};

			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([{ id: 'file-1', fileName: 'orphan.pdf', Folder: null }])
			);

			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					id: 'dest-folder-id',
					caseId: 'case-123',
					displayName: 'Target'
				})
			);

			mockDb.document.updateMany.mock.mockImplementation(() => Promise.resolve({ count: 1 }));

			const handler = buildSaveController(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(recordedAudits.length, 1);
			assert.strictEqual(recordedAudits[0].metadata.oldFolderName, '-');
			assert.strictEqual(recordedAudits[0].metadata.folderName, 'Target');
		});

		it('should use fallback dash when destination folder name is missing', async () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: 'dest-folder-id' } };
			mockReq.session = {
				moveFilesIds: ['file-1'],
				account: { localAccountId: 'user-999' }
			};

			mockDb.document.findMany.mock.mockImplementation(() =>
				Promise.resolve([{ id: 'file-1', fileName: 'doc.pdf', Folder: { displayName: 'Origin' } }])
			);

			// Transaction returns folder without displayName
			mockDb.$transaction.mock.mockImplementation(async (cb: any) => {
				await cb(mockDb);
				return { id: 'dest-folder-id', displayName: null };
			});

			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					id: 'dest-folder-id',
					caseId: 'case-123',
					displayName: null
				})
			);

			mockDb.document.updateMany.mock.mockImplementation(() => Promise.resolve({ count: 1 }));

			const handler = buildSaveController(mockService);
			// This will hit notFoundHandler or redirect depending on the null displayName,
			// but the audit should still have recorded with a dash
			try {
				await handler(mockReq, mockRes, mockNext);
			} catch {
				// May throw due to null displayName in redirect path
			}

			assert.strictEqual(recordedAudits.length, 1);
			assert.strictEqual(recordedAudits[0].metadata.folderName, '-');
			assert.strictEqual(recordedAudits[0].metadata.oldFolderName, 'Origin');
		});

		it('should not record audit entries if no documents were found before move', async () => {
			mockRes.locals.journeyResponse = { answers: { fileLocation: 'dest-folder-id' } };
			mockReq.session = {
				moveFilesIds: ['file-1'],
				account: { localAccountId: 'user-999' }
			};

			mockDb.document.findMany.mock.mockImplementation(() => Promise.resolve([]));

			mockDb.folder.findUnique.mock.mockImplementation(() =>
				Promise.resolve({
					id: 'dest-folder-id',
					caseId: 'case-123',
					displayName: 'Target'
				})
			);

			mockDb.document.updateMany.mock.mockImplementation(() => Promise.resolve({ count: 0 }));

			const handler = buildSaveController(mockService);
			await handler(mockReq, mockRes, mockNext);

			assert.strictEqual(recordedAudits.length, 0);
		});
	});
});
