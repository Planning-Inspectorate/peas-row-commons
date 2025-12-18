import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { checkForDuplicateFiles, checkTotalSizeLimit } from './validation-middleware.ts'; // Update path

const createMockFile = (name: any, size = 100) =>
	({
		originalname: name,
		size: size
	}) as any;

describe('File Duplicate and Size Checks', () => {
	const mockReq = { sessionID: 'session-123' } as any;
	const caseId = 'case-123';

	describe('checkForDuplicateFiles', () => {
		it('should return false if no duplicates exist in the DB', async () => {
			const mockDb = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([{ fileName: 'other.pdf' }, { fileName: 'existing.pdf' }]))
				}
			} as any;

			const newFiles = [createMockFile('new-file.pdf')];

			const result = await checkForDuplicateFiles(mockDb, mockReq, newFiles, caseId);

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

			const result = await checkForDuplicateFiles(mockDb, mockReq, newFiles, caseId);

			assert.strictEqual(result, true);
		});

		it('should return false if DB is empty', async () => {
			const mockDb = {
				draftDocument: {
					findMany: mock.fn(() => Promise.resolve([]))
				}
			} as any;

			const newFiles = [createMockFile('any.pdf')];
			const result = await checkForDuplicateFiles(mockDb, mockReq, newFiles, caseId);

			assert.strictEqual(result, false);
		});
	});

	describe('checkTotalSizeLimit', () => {
		const LIMIT = 1000;

		it('should return false (safe) if current DB size + new files < limit', async () => {
			const mockDb = {
				draftDocument: {
					aggregate: mock.fn(() =>
						Promise.resolve({
							_sum: { size: 500 }
						})
					)
				}
			} as any;

			const newFiles = [createMockFile('new.pdf', 200)]; // + 200 bytes = 700 total

			const result = await checkTotalSizeLimit(mockDb, mockReq, caseId, newFiles, LIMIT);

			assert.strictEqual(result, false); // 700 < 1000, so NOT over limit
		});

		it('should return true (over limit) if current DB size + new files > limit', async () => {
			const mockDb = {
				draftDocument: {
					aggregate: mock.fn(() =>
						Promise.resolve({
							_sum: { size: 900 }
						})
					)
				}
			} as any;

			const newFiles = [createMockFile('new.pdf', 200)]; // + 200 bytes = 1100 total

			const result = await checkTotalSizeLimit(mockDb, mockReq, caseId, newFiles, LIMIT);

			assert.strictEqual(result, true); // 1100 > 1000
		});

		it('should handle null aggregate (no files in DB) correctly', async () => {
			const mockDb = {
				draftDocument: {
					aggregate: mock.fn(() =>
						Promise.resolve({
							_sum: { size: null }
						})
					)
				}
			} as any;

			const newFiles = [createMockFile('new.pdf', 500)];

			const result = await checkTotalSizeLimit(mockDb, mockReq, caseId, newFiles, LIMIT);

			assert.strictEqual(result, false); // 0 + 500 < 1000
		});

		it('should sum up multiple new files correctly', async () => {
			const mockDb = {
				draftDocument: {
					aggregate: mock.fn(() =>
						Promise.resolve({
							_sum: { size: 800 }
						})
					)
				}
			} as any;

			const newFiles = [createMockFile('1.pdf', 100), createMockFile('2.pdf', 150)];

			const result = await checkTotalSizeLimit(mockDb, mockReq, caseId, newFiles, LIMIT);

			assert.strictEqual(result, true);
		});
	});
});
