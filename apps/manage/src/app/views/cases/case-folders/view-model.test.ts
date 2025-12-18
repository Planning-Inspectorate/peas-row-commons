import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createFoldersViewModel } from './view-model.ts';

describe('createFoldersViewModel', () => {
	it('should sort folders by displayOrder in ascending order and add encodedDisplayName', () => {
		const folders = [
			{ id: '1', displayName: 'Third Folder', displayOrder: 300 },
			{ id: '2', displayName: 'First', displayOrder: 100 },
			{ id: '3', displayName: 'Second_Folder', displayOrder: 200 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].displayName, 'First');
		assert.strictEqual(result[0].encodedDisplayName, 'First');

		assert.strictEqual(result[1].displayName, 'Second_Folder');
		assert.strictEqual(result[1].encodedDisplayName, 'Second_Folder');

		assert.strictEqual(result[2].displayName, 'Third Folder');
		assert.strictEqual(result[2].encodedDisplayName, 'Third%20Folder');
	});

	it('should treat folders without displayOrder as having order 100', () => {
		const folders = [
			{ id: '1', displayName: 'Order Ten', displayOrder: 10 },
			{ id: '2', displayName: 'No Order', displayOrder: null },
			{ id: '3', displayName: 'Order Two Hundred', displayOrder: 200 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].displayName, 'Order Ten');
		assert.strictEqual(result[0].encodedDisplayName, 'Order%20Ten');

		assert.strictEqual(result[1].displayName, 'No Order');
		assert.strictEqual(result[1].encodedDisplayName, 'No%20Order');

		assert.strictEqual(result[2].displayName, 'Order Two Hundred');
		assert.strictEqual(result[2].encodedDisplayName, 'Order%20Two%20Hundred');
	});

	it('should return an empty array if input is empty', () => {
		const result = createFoldersViewModel([]);
		assert.deepStrictEqual(result, []);
	});

	it('should handle complex strings for kebab conversion', () => {
		const folders = [
			{ id: '1', displayName: 'Notices and order documents', displayOrder: 1 },
			{ id: '2', displayName: 'AdvertisedModifications', displayOrder: 2 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].encodedDisplayName, 'Notices%20and%20order%20documents');
		assert.strictEqual(result[1].encodedDisplayName, 'AdvertisedModifications');
	});

	it('should maintain stable sort for items with same displayOrder', () => {
		const folders = [
			{ id: '1', displayName: 'Alpha Item', displayOrder: 50 },
			{ id: '2', displayName: 'Beta Item', displayOrder: 50 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].displayName, 'Alpha Item');
		assert.strictEqual(result[0].encodedDisplayName, 'Alpha%20Item');

		assert.strictEqual(result[1].displayName, 'Beta Item');
		assert.strictEqual(result[1].encodedDisplayName, 'Beta%20Item');
	});
});
