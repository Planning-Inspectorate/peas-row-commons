import { describe, it } from 'node:test';
import { getPaginationParams, getPageData } from './pagination-utils.ts';
import assert from 'node:assert';

describe('pagination-utils', () => {
	describe('getPaginationParams', () => {
		it('pagination params should be returned when items per page is 50 and page is 2', () => {
			const mockReq = { query: { itemsPerPage: 50, page: 2 } };

			const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(mockReq as any);

			assert.strictEqual(selectedItemsPerPage, 50);
			assert.strictEqual(pageNumber, 2);
			assert.strictEqual(pageSize, 50);
			assert.strictEqual(skipSize, 50);
		});
		it('pagination params should be returned when items per page is 100 and page is 5', () => {
			const mockReq = { query: { itemsPerPage: 100, page: 5 } };

			const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(mockReq as any);

			assert.strictEqual(selectedItemsPerPage, 100);
			assert.strictEqual(pageNumber, 5);
			assert.strictEqual(pageSize, 100);
			assert.strictEqual(skipSize, 400);
		});
		it('default values should be returned if query params is empty', () => {
			const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams({} as any);

			assert.strictEqual(selectedItemsPerPage, 25);
			assert.strictEqual(pageNumber, 1);
			assert.strictEqual(pageSize, 25);
			assert.strictEqual(skipSize, 0);
		});
	});
	describe('getPageData', () => {
		it('should return page data based on provided values', () => {
			const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(225, 25, 25, 3);

			assert.strictEqual(totalPages, 9);
			assert.strictEqual(resultsStartNumber, 51);
			assert.strictEqual(resultsEndNumber, 75);
		});
	});
});
