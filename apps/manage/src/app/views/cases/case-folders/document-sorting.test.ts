import type { Request } from 'express';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDocumentSorting } from './document-sorting.ts';

function createRequest(query: Record<string, string> = {}) {
	return {
		baseUrl: '/cases/case-123/case-folders',
		path: '/search-results',
		query,
		session: {}
	} as Request;
}

describe('getDocumentSorting', () => {
	it('should default to Uploaded descending and save the preference', () => {
		const req = createRequest();

		const result = getDocumentSorting(req, 'file-search');

		assert.deepStrictEqual(result.sanitisedOrderByQuery, {
			sortField: 'uploaded',
			sortOrder: 'desc'
		});
		assert.deepStrictEqual(result.primaryOrder, { uploadedDate: 'desc' });
		assert.strictEqual(result.sortValue, '&sortBy=uploaded&order=desc');
		assert.strictEqual(result.sortParams.toString(), 'sortBy=uploaded&order=desc');
		assert.deepStrictEqual(req.session.tableSorts, {
			'file-search': { sortBy: 'uploaded', sortOrder: 'desc' }
		});

		const uploadedHeader = result.sortHeaders[1];
		assert.ok('html' in uploadedHeader);
		assert.strictEqual(uploadedHeader.attributes['aria-sort'], 'descending');
		assert.ok(uploadedHeader.html.includes('sortBy=uploaded&order=asc'));
	});

	it('should sort File name ascending and link to descending', () => {
		const req = createRequest({ sortBy: 'fileName', order: 'asc' });

		const result = getDocumentSorting(req, 'file-search');

		assert.deepStrictEqual(result.primaryOrder, { fileName: 'asc' });
		assert.strictEqual(result.sortValue, '&sortBy=fileName&order=asc');

		const fileNameHeader = result.sortHeaders[0];
		assert.ok('html' in fileNameHeader);
		assert.strictEqual(fileNameHeader.attributes['aria-sort'], 'ascending');
		assert.ok(fileNameHeader.html.includes('sortBy=fileName&order=desc'));
	});

	it('should sort File name descending and link to ascending', () => {
		const req = createRequest({ sortBy: 'fileName', order: 'desc' });

		const result = getDocumentSorting(req, 'file-search');

		assert.deepStrictEqual(result.primaryOrder, { fileName: 'desc' });
		assert.strictEqual(result.sortValue, '&sortBy=fileName&order=desc');

		const fileNameHeader = result.sortHeaders[0];
		assert.ok('html' in fileNameHeader);
		assert.strictEqual(fileNameHeader.attributes['aria-sort'], 'descending');
		assert.ok(fileNameHeader.html.includes('sortBy=fileName&order=asc'));
	});

	it('should sort Uploaded ascending and link to descending', () => {
		const req = createRequest({ sortBy: 'uploaded', order: 'asc' });

		const result = getDocumentSorting(req, 'file-search');

		assert.deepStrictEqual(result.primaryOrder, { uploadedDate: 'asc' });
		assert.strictEqual(result.sortValue, '&sortBy=uploaded&order=asc');

		const uploadedHeader = result.sortHeaders[1];
		assert.ok('html' in uploadedHeader);
		assert.strictEqual(uploadedHeader.attributes['aria-sort'], 'ascending');
		assert.ok(uploadedHeader.html.includes('sortBy=uploaded&order=desc'));
	});

	it('should include Status and Actions after the sortable headers', () => {
		const result = getDocumentSorting(createRequest(), 'file-search');

		assert.strictEqual(result.sortHeaders.length, 4);
		assert.deepStrictEqual(result.sortHeaders[2], { text: 'Status' });
		assert.deepStrictEqual(result.sortHeaders[3], { text: 'Actions' });
	});

	it('should restore the saved preference on a later request', () => {
		const firstRequest = createRequest({
			sortBy: 'fileName',
			order: 'asc'
		});

		getDocumentSorting(firstRequest, 'file-search');

		const returnRequest = createRequest();
		returnRequest.session = firstRequest.session;

		const result = getDocumentSorting(returnRequest, 'file-search');

		assert.deepStrictEqual(result.primaryOrder, { fileName: 'asc' });
		assert.strictEqual(result.sortValue, '&sortBy=fileName&order=asc');
	});

	it('should let URL parameters override the saved preference', () => {
		const req = createRequest({ sortBy: 'uploaded', order: 'asc' });
		req.session.tableSorts = {
			'file-search': { sortBy: 'fileName', sortOrder: 'desc' }
		};

		const result = getDocumentSorting(req, 'file-search');

		assert.deepStrictEqual(result.primaryOrder, { uploadedDate: 'asc' });
		assert.deepStrictEqual(req.session.tableSorts['file-search'], {
			sortBy: 'uploaded',
			sortOrder: 'asc'
		});
	});

	it('should keep folder and search preferences separate', () => {
		const req = createRequest();
		req.session.tableSorts = {
			'case-folder': { sortBy: 'fileName', sortOrder: 'asc' },
			'file-search': { sortBy: 'uploaded', sortOrder: 'desc' },
			'personal-list': { sortBy: 'name', sortOrder: 'asc' }
		};

		const folderSorting = getDocumentSorting(req, 'case-folder');
		const searchSorting = getDocumentSorting(req, 'file-search');

		assert.deepStrictEqual(folderSorting.primaryOrder, { fileName: 'asc' });
		assert.deepStrictEqual(searchSorting.primaryOrder, { uploadedDate: 'desc' });
		assert.deepStrictEqual(req.session.tableSorts, {
			'case-folder': { sortBy: 'fileName', sortOrder: 'asc' },
			'file-search': { sortBy: 'uploaded', sortOrder: 'desc' },
			'personal-list': { sortBy: 'name', sortOrder: 'asc' }
		});
	});

	it('should fall back to defaults for invalid sorting parameters', () => {
		const req = createRequest({
			sortBy: 'size',
			order: 'invalid'
		});

		const result = getDocumentSorting(req, 'file-search');

		assert.deepStrictEqual(result.primaryOrder, { uploadedDate: 'desc' });
		assert.deepStrictEqual(req.session.tableSorts?.['file-search'], {
			sortBy: 'uploaded',
			sortOrder: 'desc'
		});
	});

	it('should use the saved preference when URL sorting parameters are invalid', () => {
		const req = createRequest({
			sortBy: 'size',
			order: 'invalid'
		});
		req.session.tableSorts = {
			'file-search': { sortBy: 'fileName', sortOrder: 'asc' }
		};

		const result = getDocumentSorting(req, 'file-search');

		assert.deepStrictEqual(result.primaryOrder, { fileName: 'asc' });
	});

	it('should ignore invalid saved preferences', () => {
		const req = createRequest();
		req.session.tableSorts = {
			'file-search': { sortBy: 'size', sortOrder: 'asc' }
		};

		const result = getDocumentSorting(req, 'file-search');

		assert.deepStrictEqual(result.primaryOrder, { uploadedDate: 'asc' });
		assert.deepStrictEqual(req.session.tableSorts['file-search'], {
			sortBy: 'uploaded',
			sortOrder: 'asc'
		});
	});

	it('should keep search criteria and page size but remove page from sort links', () => {
		const req = createRequest({
			searchCriteria: 'test & letter',
			itemsPerPage: '50',
			page: '2'
		});

		const result = getDocumentSorting(req, 'file-search');
		const fileNameHeader = result.sortHeaders[0];

		assert.ok('html' in fileNameHeader);

		const href = fileNameHeader.html.match(/href="([^"]+)"/)?.[1];
		assert.ok(href, 'File name header should contain a navigation link');

		const sortUrl = new URL(href, 'https://localhost');

		assert.strictEqual(sortUrl.pathname, '/cases/case-123/case-folders/search-results');
		assert.strictEqual(sortUrl.searchParams.get('searchCriteria'), 'test & letter');
		assert.strictEqual(sortUrl.searchParams.get('itemsPerPage'), '50');
		assert.strictEqual(sortUrl.searchParams.has('page'), false);
		assert.strictEqual(sortUrl.searchParams.get('sortBy'), 'fileName');
		assert.strictEqual(sortUrl.searchParams.get('order'), 'asc');
	});
});
