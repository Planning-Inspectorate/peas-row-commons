import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createFoldersViewModel } from './view-model.ts';

describe('createFoldersViewModel', () => {
	it('should sort folders by displayOrder in ascending order', () => {
		const folders = [
			{ id: '1', displayName: 'Third', displayOrder: 300 },
			{ id: '2', displayName: 'First', displayOrder: 100 },
			{ id: '3', displayName: 'Second', displayOrder: 200 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].displayName, 'First');
		assert.strictEqual(result[1].displayName, 'Second');
		assert.strictEqual(result[2].displayName, 'Third');
	});

	it('should treat folders without displayOrder as having order 100', () => {
		const folders = [
			{ id: '1', displayName: 'Order 10', displayOrder: 10 },
			{ id: '2', displayName: 'No Order (Default 100)' },
			{ id: '3', displayName: 'Order 200', displayOrder: 200 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].displayName, 'Order 10');
		assert.strictEqual(result[1].displayName, 'No Order (Default 100)');
		assert.strictEqual(result[2].displayName, 'Order 200');
	});

	it('should return an empty array if input is empty', () => {
		const result = createFoldersViewModel([]);
		assert.deepStrictEqual(result, []);
	});

	it('should maintain stable sort for items with same displayOrder', () => {
		const folders = [
			{ id: '1', displayName: 'A', displayOrder: 50 },
			{ id: '2', displayName: 'B', displayOrder: 50 }
		];

		const result = createFoldersViewModel(folders as any);

		assert.strictEqual(result[0].displayName, 'A');
		assert.strictEqual(result[1].displayName, 'B');
	});
});
