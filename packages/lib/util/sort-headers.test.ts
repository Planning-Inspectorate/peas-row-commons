import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Request } from 'express';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getSortHeaders, type SortableColumn } from './sort-headers.ts';

const createMockReq = (
	query: Record<string, string | string[]> = {},
	baseUrl = 'https://example.com',
	path = '/cases'
): Request => {
	return { baseUrl, path, query } as unknown as Request;
};

const COLUMNS: SortableColumn[] = [
	{ key: 'reference', label: 'Reference', classes: 'govuk-!-width-one-fifth' },
	{ key: 'name', label: 'Case name' },
	{ key: 'receivedDate', label: 'Received' }
];

describe('getSortHeaders', () => {
	it('should return one header per column, preserving classes', () => {
		const req = createMockReq();
		const headers = getSortHeaders(req, COLUMNS, {
			sortField: 'receivedDate',
			sortOrder: Prisma.SortOrder.desc
		});

		assert.strictEqual(headers.length, COLUMNS.length);

		for (const column of COLUMNS) {
			const header = findHeaderByKey(headers, column.key);
			assert.strictEqual(header.classes, column.classes);
		}
	});

	it('should render each column label and a sort link', () => {
		const req = createMockReq();
		const headers = getSortHeaders(req, COLUMNS, {
			sortField: 'receivedDate',
			sortOrder: Prisma.SortOrder.desc
		});

		assert.strictEqual(headers.length, COLUMNS.length);

		for (const column of COLUMNS) {
			const header = findHeaderByKey(headers, column.key);
			const label = column.label;
			assert.ok(header.html.includes(label), `expected header html to include label "${label}"`);
			assert.match(header.html, /<a class="govuk-link/);
			assert.match(header.html, /href="/);
		}
	});

	it('should return headers in the same order as the input columns', () => {
		const req = createMockReq();
		const headers = getSortHeaders(req, COLUMNS, {
			sortField: 'receivedDate',
			sortOrder: Prisma.SortOrder.desc
		});

		const keys = headers.map((header) =>
			new URL(extractHref(header.html), 'https://example.com').searchParams.get('sortBy')
		);
		assert.deepStrictEqual(
			keys,
			COLUMNS.map((c) => c.key)
		);
	});

	describe('link query params', () => {
		it('should set sortBy to the column key and order ascending for an inactive column', () => {
			const req = createMockReq();
			const headers = getSortHeaders(req, COLUMNS, {
				sortField: 'receivedDate',
				sortOrder: Prisma.SortOrder.desc
			});

			// 'name' is not the active column => first click sorts ascending
			const nameHref = extractHref(findHeaderByKey(headers, 'name').html);
			const params = new URL(nameHref, 'https://example.com').searchParams;
			assert.strictEqual(params.get('sortBy'), 'name');
			assert.strictEqual(params.get('order'), 'asc');
		});

		it('should toggle to descending when the active column is currently ascending', () => {
			const req = createMockReq();
			const headers = getSortHeaders(req, COLUMNS, {
				sortField: 'name',
				sortOrder: Prisma.SortOrder.asc
			});

			const nameHref = extractHref(findHeaderByKey(headers, 'name').html);
			const params = new URL(nameHref, 'https://example.com').searchParams;
			assert.strictEqual(params.get('sortBy'), 'name');
			assert.strictEqual(params.get('order'), 'desc');
		});

		it('should toggle to ascending when the active column is currently descending', () => {
			const req = createMockReq();
			const headers = getSortHeaders(req, COLUMNS, {
				sortField: 'name',
				sortOrder: Prisma.SortOrder.desc
			});

			const nameHref = extractHref(findHeaderByKey(headers, 'name').html);
			const params = new URL(nameHref, 'https://example.com').searchParams;
			assert.strictEqual(params.get('order'), 'asc');
		});

		it('should preserve existing filter/search params in sort links', () => {
			const req = createMockReq({ type: 'housing', searchCriteria: 'demo' });
			const headers = getSortHeaders(req, COLUMNS, {
				sortField: 'receivedDate',
				sortOrder: Prisma.SortOrder.desc
			});

			const href = extractHref(findHeaderByKey(headers, 'reference').html);
			const params = new URL(href, 'https://example.com').searchParams;
			assert.strictEqual(params.get('type'), 'housing');
			assert.strictEqual(params.get('searchCriteria'), 'demo');
		});

		it('should preserve array query params', () => {
			const req = createMockReq({ status: ['open', 'closed'] });
			const headers = getSortHeaders(req, COLUMNS, {
				sortField: 'receivedDate',
				sortOrder: Prisma.SortOrder.desc
			});

			const href = extractHref(findHeaderByKey(headers, 'reference').html);
			const params = new URL(href, 'https://example.com').searchParams;
			assert.deepStrictEqual(params.getAll('status'), ['open', 'closed']);
		});

		it('should drop the page param so sorting resets to page 1', () => {
			const req = createMockReq({ page: '3' });
			const headers = getSortHeaders(req, COLUMNS, {
				sortField: 'receivedDate',
				sortOrder: Prisma.SortOrder.desc
			});

			const href = extractHref(findHeaderByKey(headers, 'reference').html);
			const params = new URL(href, 'https://example.com').searchParams;
			assert.strictEqual(params.has('page'), false);
		});

		it('should override any existing sortBy/order from the request', () => {
			const req = createMockReq({ sortBy: 'name', order: 'asc' });
			const headers = getSortHeaders(req, COLUMNS, {
				sortField: 'name',
				sortOrder: Prisma.SortOrder.asc
			});

			// header for 'reference' should carry its own key, not the stale one
			const href = extractHref(findHeaderByKey(headers, 'reference').html);
			const params = new URL(href, 'https://example.com').searchParams;
			assert.strictEqual(params.get('sortBy'), 'reference');
			assert.deepStrictEqual(params.getAll('sortBy'), ['reference']); // not duplicated
			assert.deepStrictEqual(params.getAll('order'), ['asc']);
		});
	});

	describe('aria-sort and arrow indicators', () => {
		it('should mark only the active column with aria-sort and an arrow', () => {
			const req = createMockReq();
			const headers = getSortHeaders(req, COLUMNS, {
				sortField: 'receivedDate',
				sortOrder: Prisma.SortOrder.desc
			});

			// inactive
			const referenceHeader = findHeaderByKey(headers, 'reference');
			assert.match(referenceHeader.html, /aria-sort="none"/);
			assert.doesNotMatch(referenceHeader.html, /aria-hidden/);

			// active
			const receivedDateHeader = findHeaderByKey(headers, 'receivedDate');
			assert.match(receivedDateHeader.html, /aria-sort="descending"/);
			assert.match(receivedDateHeader.html, /aria-hidden="true"/);
			assert.match(receivedDateHeader.html, /▼/);
		});

		it('should show ascending arrow when the active column is ascending', () => {
			const req = createMockReq();
			const headers = getSortHeaders(req, COLUMNS, {
				sortField: 'receivedDate',
				sortOrder: Prisma.SortOrder.asc
			});

			const receivedDateHeader = findHeaderByKey(headers, 'receivedDate');
			assert.match(receivedDateHeader.html, /aria-sort="ascending"/);
			assert.match(receivedDateHeader.html, /▲/);
		});
	});

	it('should handle an empty query object', () => {
		const req = createMockReq({});
		const headers = getSortHeaders(req, COLUMNS, {
			sortField: 'name',
			sortOrder: Prisma.SortOrder.asc
		});
		assert.strictEqual(headers.length, 3);
	});
});

function extractHref(html: string): string {
	const match = html.match(/href="([^"]+)"/);
	assert.ok(match, 'expected an href in header html');
	return match[1];
}

function findHeaderByKey(headers: ReturnType<typeof getSortHeaders>, key: string) {
	const header = headers.find((h) => {
		const href = extractHref(h.html);
		return new URL(href, 'https://example.com').searchParams.get('sortBy') === key;
	});
	assert.ok(header, `expected to find a header for key "${key}"`);
	return header;
}
