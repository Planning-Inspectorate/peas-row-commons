import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { addCaseIdToFolders, createFolders, findFolders, FOLDER_TEMPLATES_MAP } from './folder-utils.ts';
import { CASE_TYPES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/types.ts';

describe('Folder creation utils', () => {
	describe('findFolders', () => {
		const mockLookupMap = {
			TEST_TYPE_1: [{ displayName: 'Folder A', displayOrder: 1 }],
			TEST_TYPE_2: [{ displayName: 'Folder B', displayOrder: 2 }]
		};

		it('should return the correct folder structure for a known typeId', () => {
			const result = findFolders('TEST_TYPE_1' as any, mockLookupMap as any);
			assert.deepStrictEqual(result, mockLookupMap['TEST_TYPE_1']);
		});

		it('should return an empty array if typeId is not found in map', () => {
			const result = findFolders('UNKNOWN_TYPE' as any, mockLookupMap as any);
			assert.deepStrictEqual(result, []);
		});

		it('should work with the real FOLDER_TEMPLATES_MAP', () => {
			const result = findFolders(CASE_TYPES_ID.COASTAL_ACCESS, FOLDER_TEMPLATES_MAP);
			assert.ok(Array.isArray(result));
		});
	});

	describe('addCaseIdToFolders', () => {
		const caseId = '1001';

		it('should inject caseId into a flat list of folders', () => {
			const inputFolders = [
				{ displayName: 'F1', displayOrder: 1 },
				{ displayName: 'F2', displayOrder: 2 }
			];

			const result = addCaseIdToFolders(inputFolders, caseId);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].caseId, caseId);
			assert.strictEqual(result[1].caseId, caseId);
		});

		it('should recursively inject caseId into nested "ChildFolders.create" arrays', () => {
			const inputFolders = [
				{
					displayName: 'Parent',
					displayOrder: 1,
					ChildFolders: {
						create: [
							{ displayName: 'Child 1', displayOrder: 1 },
							{ displayName: 'Child 2', displayOrder: 2 }
						]
					}
				}
			];

			const result = addCaseIdToFolders(inputFolders, caseId);

			// Check Parent
			assert.strictEqual(result[0].caseId, caseId);

			// Check Children
			const children: any = result[0]?.ChildFolders?.create;
			assert.strictEqual(children?.length, 2);
			assert.strictEqual(children[0].caseId, caseId);
			assert.strictEqual(children[1].caseId, caseId);
		});

		it('should not mutate the original objects', () => {
			const inputFolders = [{ displayName: 'F1', displayOrder: 1 }];
			const result = addCaseIdToFolders(inputFolders, caseId);

			assert.notStrictEqual(result[0], inputFolders[0]);
			assert.strictEqual((inputFolders[0] as any).caseId, undefined);
		});
	});

	describe('createFolders', () => {
		it('should call tx.folder.create for each top-level folder', async () => {
			const caseId = '2002';
			const folders = [
				{ displayName: 'Folder A', displayOrder: 1 },
				{ displayName: 'Folder B', displayOrder: 2 }
			];

			// Mock the Prisma transaction object
			const mockCreate = mock.fn();
			const tx = { folder: { create: mockCreate } };

			await createFolders(folders, caseId, tx);

			assert.strictEqual(mockCreate.mock.callCount(), 2);

			// Validate arguments passed to Prisma
			const firstCallArgs = mockCreate.mock.calls[0].arguments[0];
			assert.deepStrictEqual(firstCallArgs, {
				data: {
					displayName: 'Folder A',
					displayOrder: 1,
					caseId: '2002'
				}
			});
		});

		it('should pass nested structure to Prisma create correctly', async () => {
			const caseId = '3003';
			const folders = [
				{
					displayName: 'Parent',
					displayOrder: 1,
					ChildFolders: {
						create: [{ displayName: 'Child', displayOrder: 1 }]
					}
				}
			];

			const mockCreate = mock.fn();
			const tx = { folder: { create: mockCreate } };

			await createFolders(folders, caseId, tx);

			assert.strictEqual(mockCreate.mock.callCount(), 1);

			const callData = mockCreate.mock.calls[0].arguments[0].data;

			// Ensure the transformation happened before passing to tx.create
			assert.strictEqual(callData.caseId, caseId);
			assert.strictEqual(callData.ChildFolders.create[0].caseId, caseId);
		});
	});
});
