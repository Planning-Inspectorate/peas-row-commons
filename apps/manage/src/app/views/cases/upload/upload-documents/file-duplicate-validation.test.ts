import { describe, it, mock } from 'node:test';
import {
	checkFileNameConflict,
	checkFileNamesConflict,
	checkForDuplicateFilesInDraft,
	getExistingFileNamesInFolder
} from './file-duplicate-validation.ts';
import assert from 'node:assert/strict';

const createMockFile = (name: any, size = 100) =>
	({
		originalname: name,
		size: size
	}) as any;

describe('Duplicate validation', () => {
	describe('checkForDuplicateFilesInDraft', () => {
		const mockReq = { sessionID: 'session-123' } as any;
		const caseId = 'case-123';

		it('should return false if no duplicates exist in the DB', async () => {
			const mockDb = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([{ fileName: 'other.pdf' }, { fileName: 'existing.pdf' }]))
				}
			} as any;

			const newFiles = [createMockFile('new-file.pdf')];

			const result = await checkForDuplicateFilesInDraft(mockDb, mockReq, newFiles, caseId);

			assert.strictEqual(result, false);
			assert.strictEqual(mockDb.draftDocument.findMany.mock.calls[0].arguments[0].where.sessionKey, 'session-123');
		});

		it('should return true if a duplicate name is found', async () => {
			const mockDb = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([{ fileName: 'duplicate.pdf' }]))
				}
			} as any;

			const newFiles = [createMockFile('unique.pdf'), createMockFile('duplicate.pdf')];

			const result = await checkForDuplicateFilesInDraft(mockDb, mockReq, newFiles, caseId);

			assert.strictEqual(result, true);
		});

		it('should return false if DB is empty', async () => {
			const mockDb = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([]))
				}
			} as any;

			const newFiles = [createMockFile('any.pdf')];
			const result = await checkForDuplicateFilesInDraft(mockDb, mockReq, newFiles, caseId);

			assert.strictEqual(result, false);
		});
	});

	describe('getExistingFileNamesInFolder', () => {
		it("should return an empty array if the folder doesn't exist", async () => {
			const mockDb = {
				folder: {
					findUnique: mock.fn(() => Promise.resolve(null))
				}
			};
			const existingFileNames = await getExistingFileNamesInFolder(mockDb as any, 'folder-1');
			assert.strictEqual(mockDb.folder.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(existingFileNames, []);
		});

		it('should return the filenames of all documents', async () => {
			const mockDb = {
				folder: {
					findUnique: mock.fn(() =>
						Promise.resolve({
							id: 'folder-123',
							displayName: 'test',
							Documents: [
								{
									fileName: 'first.pdf'
								},
								{
									fileName: 'second.pdf'
								}
							]
						})
					)
				}
			};

			const existingFileNames = await getExistingFileNamesInFolder(mockDb as any, 'folder-123');
			assert.strictEqual(mockDb.folder.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(existingFileNames, ['first.pdf', 'second.pdf']);
		});

		it('should return an empty array if no documents are in the folder', async () => {
			const mockDb = {
				folder: {
					findUnique: mock.fn(() =>
						Promise.resolve({
							id: 'folder-123',
							displayName: 'test',
							Documents: []
						})
					)
				}
			};

			const existingFileNames = await getExistingFileNamesInFolder(mockDb as any, 'folder-123');
			assert.strictEqual(mockDb.folder.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(existingFileNames, []);
		});
	});

	describe('checkFileNameConflict', () => {
		it('should return a validation error if the filename is in the existingFileNames', () => {
			const fileName = 'new.pdf';
			const existingFileNames = new Set([fileName]);
			const errors = checkFileNameConflict(fileName, existingFileNames);
			assert.deepStrictEqual(errors, {
				text: 'new.pdf: File with this name already exists in the folder',
				href: '#upload-form'
			});
		});

		it('should return null if the filename is unique', () => {
			const fileName = 'new.pdf';
			const existingFileNames = new Set(['another-file.pdf']);
			const errors = checkFileNameConflict(fileName, existingFileNames);
			assert.strictEqual(errors, null);
		});
	});

	describe('checkFileNamesConflict', () => {
		it('should fast pass if the existingFileNames set is empty', () => {
			const fileNames = ['new.pdf', 'another-file.pdf'];
			const existingFileNames = new Set([]);
			const errors = checkFileNamesConflict(fileNames, existingFileNames);
			assert.strictEqual(errors, null);
		});

		it('should list all files that are in conflict', () => {
			const fileNames = ['new.pdf', 'another-file.pdf', 'a-last-file.pdf'];
			const existingFileNames = new Set(['new.pdf', 'another-file.pdf']);
			const errors = checkFileNamesConflict(fileNames, existingFileNames);
			assert.deepStrictEqual(errors, [
				{
					text: 'new.pdf: File with this name already exists in the folder',
					href: '#upload-form'
				},
				{
					text: 'another-file.pdf: File with this name already exists in the folder',
					href: '#upload-form'
				}
			]);
		});
	});
});
