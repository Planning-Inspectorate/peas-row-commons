import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createFoldersViewModel } from './view-model.ts';

describe('createFoldersViewModel', () => {
	it('should sort folders by displayOrder in ascending order and add kebabDisplayName', () => {
		const folders = [
			{ id: '1', displayName: 'Third Folder', displayOrder: 300 },
			{ id: '2', displayName: 'First', displayOrder: 100 },
			{ id: '3', displayName: 'Second_Folder', displayOrder: 200 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].displayName, 'First');
		assert.strictEqual(result[0].kebabDisplayName, 'first');

		assert.strictEqual(result[1].displayName, 'Second_Folder');
		assert.strictEqual(result[1].kebabDisplayName, 'second-folder');

		assert.strictEqual(result[2].displayName, 'Third Folder');
		assert.strictEqual(result[2].kebabDisplayName, 'third-folder');
	});

	it('should treat folders without displayOrder as having order 100', () => {
		const folders = [
			{ id: '1', displayName: 'Order Ten', displayOrder: 10 },
			{ id: '2', displayName: 'No Order', displayOrder: null },
			{ id: '3', displayName: 'Order Two Hundred', displayOrder: 200 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].displayName, 'Order Ten');
		assert.strictEqual(result[0].kebabDisplayName, 'order-ten');

		assert.strictEqual(result[1].displayName, 'No Order');
		assert.strictEqual(result[1].kebabDisplayName, 'no-order');

		assert.strictEqual(result[2].displayName, 'Order Two Hundred');
		assert.strictEqual(result[2].kebabDisplayName, 'order-two-hundred');
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

		assert.strictEqual(result[0].kebabDisplayName, 'notices-and-order-documents');
		assert.strictEqual(result[1].kebabDisplayName, 'advertised-modifications');
	});

	it('should maintain stable sort for items with same displayOrder', () => {
		const folders = [
			{ id: '1', displayName: 'Alpha Item', displayOrder: 50 },
			{ id: '2', displayName: 'Beta Item', displayOrder: 50 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].displayName, 'Alpha Item');
		assert.strictEqual(result[0].kebabDisplayName, 'alpha-item');

		assert.strictEqual(result[1].displayName, 'Beta Item');
		assert.strictEqual(result[1].kebabDisplayName, 'beta-item');
	});
});
