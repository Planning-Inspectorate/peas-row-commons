import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	addCaseIdToFolders,
	buildFolderTree,
	createFolders,
	findFolders,
	FOLDER_TEMPLATES_MAP
} from './folder-utils.ts';
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

			assert.strictEqual(result[0].caseId, caseId);

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

			const mockCreate = mock.fn();
			const tx = { folder: { create: mockCreate } };

			await createFolders(folders, caseId, tx);

			assert.strictEqual(mockCreate.mock.callCount(), 2);

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

			assert.strictEqual(callData.caseId, caseId);
			assert.strictEqual(callData.ChildFolders.create[0].caseId, caseId);
		});
	});

	describe('buildFolderTree', () => {
		it('should return empty array for empty input', () => {
			const result = buildFolderTree([]);
			assert.deepStrictEqual(result, []);
		});

		it('should return flat roots if no parent relationships exist', () => {
			const flatFolders = [
				{ id: '1', displayName: 'A', parentFolderId: null },
				{ id: '2', displayName: 'B', parentFolderId: null }
			];

			const result = buildFolderTree(flatFolders as any);

			assert.strictEqual(result.length, 2);
			assert.strictEqual(result[0].id, '1');
			assert.strictEqual(result[0].children.length, 0);
			assert.strictEqual(result[1].id, '2');
		});

		it('should nest children under parents correctly', () => {
			const flatFolders = [
				{ id: '1', displayName: 'Root', parentFolderId: null },
				{ id: '2', displayName: 'Child', parentFolderId: '1' },
				{ id: '3', displayName: 'Grandchild', parentFolderId: '2' }
			];

			const result = buildFolderTree(flatFolders as any);

			assert.strictEqual(result.length, 1);
			const root = result[0];
			assert.strictEqual(root.id, '1');

			assert.strictEqual(root.children.length, 1);
			const child = root.children[0];
			assert.strictEqual(child.id, '2');

			assert.strictEqual(child.children.length, 1);
			const grandchild = child.children[0];
			assert.strictEqual(grandchild.id, '3');
		});

		it('should handle multiple children for same parent', () => {
			const flatFolders = [
				{ id: '1', displayName: 'Root', parentFolderId: null },
				{ id: '2', displayName: 'Child A', parentFolderId: '1' },
				{ id: '3', displayName: 'Child B', parentFolderId: '1' }
			];

			const result = buildFolderTree(flatFolders as any);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].children.length, 2);
			assert.strictEqual(result[0].children[0].id, '2');
			assert.strictEqual(result[0].children[1].id, '3');
		});

		it('should treat orphans (missing parent in set) as roots', () => {
			const flatFolders = [{ id: '2', displayName: 'Orphan Child', parentFolderId: 'MISSING_ID' }];

			const result = buildFolderTree(flatFolders as any);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].id, '2');
		});
	});
});
