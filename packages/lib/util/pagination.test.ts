import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Request } from 'express';
import { getPaginationModel } from './pagination.ts';

const createMockReq = (
	query: Record<string, string | string[]> = {},
	baseUrl = 'https://example.com',
	path = '/cases'
): Request => {
	return {
		baseUrl,
		path,
		query
	} as unknown as Request;
};

describe('getPaginationModel', () => {
	describe('Logic & Structure', () => {
		it('should return empty items and null links for a single page', () => {
			const req = createMockReq();
			const result = getPaginationModel(req, 1, 1);

			assert.strictEqual(result.previous, null);
			assert.strictEqual(result.next, null);
			assert.deepStrictEqual(result.items, []);
		});

		it('should generate all pages without ellipses for small page counts', () => {
			const req = createMockReq();
			const result = getPaginationModel(req, 3, 1);

			assert.strictEqual(result.items.length, 3);
			assert.strictEqual(result.items[0].number, 1);
			assert.strictEqual(result.items[1].number, 2);
			assert.strictEqual(result.items[2].number, 3);

			const hasEllipsis = result.items.some((i: any) => i.ellipsis);
			assert.strictEqual(hasEllipsis, false);
		});

		it('should generate ellipses in the middle when on the first page of many', () => {
			const req = createMockReq();
			const result = getPaginationModel(req, 10, 1);

			assert.strictEqual(result.previous, null);
			assert.ok(result.next);

			assert.strictEqual(result.items[0].number, 1);
			assert.strictEqual(result.items[1].number, 2);
			assert.ok(result.items[2].ellipsis);
			assert.strictEqual(result.items[3].number, 10);
		});

		it('should generate ellipses in the middle when on the last page of many', () => {
			const req = createMockReq();
			const result = getPaginationModel(req, 10, 10);

			assert.ok(result.previous);
			assert.strictEqual(result.next, null);

			assert.strictEqual(result.items[0].number, 1);
			assert.ok(result.items[1].ellipsis);
			assert.strictEqual(result.items[2].number, 9);
			assert.strictEqual(result.items[3].number, 10);
		});

		it('should generate ellipses on BOTH sides when in the middle of a large set', () => {
			const req = createMockReq();
			const result = getPaginationModel(req, 10, 5);

			assert.ok(result.previous);
			assert.ok(result.next);

			assert.strictEqual(result.items[0].number, 1);
			assert.ok(result.items[1].ellipsis);
			assert.strictEqual(result.items[2].number, 4);

			assert.strictEqual(result.items[3].number, 5);
			assert.strictEqual(result.items[3].current, true);

			assert.strictEqual(result.items[4].number, 6);
			assert.ok(result.items[5].ellipsis);
			assert.strictEqual(result.items[6].number, 10);
		});
	});

	describe('URL Generation', () => {
		it('should preserve existing query parameters while changing the page number', () => {
			const req = createMockReq({ type: 'housing', search: 'demo' });
			const result = getPaginationModel(req, 5, 1);

			const nextUrl = result.next?.href || '';
			assert.match(nextUrl, /page=2/);
			assert.match(nextUrl, /type=housing/);
			assert.match(nextUrl, /search=demo/);

			const lastPage: any = result.items.find((i: any) => i.number === 5);
			assert.match(lastPage.href, /page=5/);
			assert.match(lastPage.href, /type=housing/);
		});

		it('should correctly handle array query parameters', () => {
			const req = createMockReq({ status: ['open', 'closed'] });
			const result = getPaginationModel(req, 5, 1);

			const nextUrl = result.next?.href || '';

			assert.match(nextUrl, /status=open/);
			assert.match(nextUrl, /status=closed/);
			assert.match(nextUrl, /page=2/);

			assert.doesNotMatch(nextUrl, /([^:]\/)\//);
		});

		it('should overwrite an existing "page" query param from the input request', () => {
			const req = createMockReq({ page: '3', sort: 'date' });

			const result = getPaginationModel(req, 10, 3);

			const nextUrl = result.next?.href || '';

			assert.match(nextUrl, /page=4/);
			assert.doesNotMatch(nextUrl, /page=3/);
			assert.match(nextUrl, /sort=date/);
		});
	});
});
