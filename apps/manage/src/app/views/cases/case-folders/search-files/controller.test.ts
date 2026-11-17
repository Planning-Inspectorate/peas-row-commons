import type { MockDb, MockResponse } from '@pins/peas-row-commons-lib/testing/type.ts';
import type { Request, Response } from 'express';
import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { buildFileSearchView } from './controller.ts';

describe('File Search View Controller', () => {
	let mockReq: {
		params: { id: string };
		query: Record<string, string>;
		baseUrl: string;
		path: string;
		session: { account: { localAccountId: string } };
	};
	let mockRes: MockResponse;
	let mockDb: MockDb;
	let mockService: { db: MockDb };

	beforeEach(() => {
		mockReq = {
			params: { id: 'case-123' },
			query: {},
			baseUrl: '/cases/case-123/case-folders/search-results',
			path: '/',
			session: { account: { localAccountId: 'user-123' } }
		};

		mockRes = {
			render: mock.fn(),
			redirect: mock.fn(),
			send: mock.fn(),
			status: mock.fn()
		};

		mockRes.status.mock.mockImplementation(() => mockRes);

		mockDb = {
			case: {
				findUnique: mock.fn(async () => ({ reference: 'CASE/123' }))
			},
			document: {
				count: mock.fn(),
				findMany: mock.fn()
			},
			$transaction: mock.fn(async (promises) => Promise.all(promises))
		};

		mockService = { db: mockDb };
	});

	it('should render empty results and include the case reference in the breadcrumb if search string is empty', async () => {
		mockReq.query.searchCriteria = '';

		const handler = buildFileSearchView(mockService as any);

		await handler(mockReq as unknown as Request, mockRes as unknown as Response, () => {});

		assert.strictEqual(mockDb.document.count.mock.callCount(), 0);
		assert.strictEqual(mockDb.document.findMany.mock.callCount(), 0);
		assert.strictEqual(mockDb.$transaction.mock.callCount(), 0);
		assert.strictEqual(mockDb.case.findUnique.mock.callCount(), 1);
		assert.deepStrictEqual(mockDb.case.findUnique.mock.calls[0].arguments[0], {
			where: { id: 'case-123' },
			select: { reference: true }
		});

		assert.strictEqual(mockRes.render.mock.callCount(), 1);

		const [view, data] = mockRes.render.mock.calls[0].arguments;
		assert.strictEqual(view, 'views/cases/case-folders/search-files/view.njk');
		assert.deepStrictEqual(data.breadcrumbItems[0], {
			text: 'CASE/123',
			href: '/cases/case-123'
		});
		assert.strictEqual(data.paginationParams.totalDocuments, 0);
		assert.deepStrictEqual(data.documents, []);
		assert.strictEqual(data.searchValue, '');
	});

	it('should render 404 if the case is not found', async () => {
		mockDb.case.findUnique.mock.mockImplementation(async () => null);

		const handler = buildFileSearchView(mockService as any);

		await handler(mockReq as unknown as Request, mockRes as unknown as Response, () => {});

		assert.strictEqual(mockRes.status.mock.callCount(), 1);
		assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockDb.document.count.mock.callCount(), 0);
		assert.strictEqual(mockDb.document.findMany.mock.callCount(), 0);
		assert.strictEqual(mockDb.$transaction.mock.callCount(), 0);
	});

	it('should query DB and render results if search string is provided', async () => {
		mockReq.query.searchCriteria = 'letter';

		mockDb.document.count.mock.mockImplementation(async () => 2);
		mockDb.document.findMany.mock.mockImplementation(async () => [
			{
				id: 'doc-1',
				fileName: 'letter_A.pdf',
				uploadedDate: new Date(),
				size: BigInt(1024),
				mimeType: 'application/pdf',
				Folder: { id: 'f1', displayName: 'General' },
				Case: { id: 'c1', legacyCaseId: 'l1' }
			},
			{
				id: 'doc-2',
				fileName: 'letter_B.pdf',
				uploadedDate: new Date(),
				size: BigInt(2048),
				mimeType: 'application/pdf',
				Folder: { id: 'f1', displayName: 'General' },
				Case: { id: 'c1', legacyCaseId: 'l1' }
			}
		]);

		const handler = buildFileSearchView(mockService as any);
		await handler(mockReq as unknown as Request, mockRes as unknown as Response, () => {});

		assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);

		const countArgs = mockDb.document.count.mock.calls[0].arguments[0];
		assert.strictEqual(countArgs.where.caseId, 'case-123');
		assert.strictEqual(countArgs.where.deletedAt, null);

		const findArgs = mockDb.document.findMany.mock.calls[0].arguments[0];
		assert.strictEqual(findArgs.where.caseId, 'case-123');
		assert.strictEqual(findArgs.include.Folder, true);
		assert.strictEqual(findArgs.take, 25);

		const [view, data] = mockRes.render.mock.calls[0].arguments;
		assert.strictEqual(data.paginationParams.totalDocuments, 2);
		assert.strictEqual(data.documents.length, 2);
		assert.strictEqual(data.searchValue, 'letter');
	});
	describe('Sorting', () => {
		beforeEach(() => {
			mockReq.query = { searchCriteria: 'test & letter' };
			mockDb.document.count.mock.mockImplementation(async () => 100);
			mockDb.document.findMany.mock.mockImplementation(async () => []);
		});

		it('should default to Uploaded descending and link to ascending', async () => {
			await buildFileSearchView(mockService as any)(
				mockReq as unknown as Request,
				mockRes as unknown as Response,
				() => {}
			);

			const dbArgs = mockDb.document.findMany.mock.calls[0].arguments[0];
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			const uploadedHeader = viewData.sortHeaders[1];

			assert.deepStrictEqual(dbArgs.orderBy, [{ uploadedDate: 'desc' }, { id: 'asc' }]);
			assert.strictEqual(viewData.sortHeaders.length, 4);
			assert.strictEqual(uploadedHeader.attributes['aria-sort'], 'descending');
			assert.strictEqual(viewData.sortHeaders[0].attributes['aria-sort'], 'none');
			assert.ok(uploadedHeader.html.includes('sortBy=uploaded&order=asc'));
			assert.deepStrictEqual(viewData.sorting, {
				sortBy: 'uploaded',
				order: 'desc'
			});
			assert.strictEqual(viewData.paginationParams.sortValue, '&sortBy=uploaded&order=desc');
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});

		it('should sort File name ascending and link to descending', async () => {
			mockReq.query.sortBy = 'fileName';
			mockReq.query.order = 'asc';

			await buildFileSearchView(mockService as any)(
				mockReq as unknown as Request,
				mockRes as unknown as Response,
				() => {}
			);

			const dbArgs = mockDb.document.findMany.mock.calls[0].arguments[0];
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			const fileNameHeader = viewData.sortHeaders[0];

			assert.deepStrictEqual(dbArgs.orderBy, [{ fileName: 'asc' }, { id: 'asc' }]);
			assert.strictEqual(fileNameHeader.attributes['aria-sort'], 'ascending');
			assert.strictEqual(viewData.sortHeaders[1].attributes['aria-sort'], 'none');
			assert.ok(fileNameHeader.html.includes('sortBy=fileName&order=desc'));
			assert.deepStrictEqual(viewData.sorting, {
				sortBy: 'fileName',
				order: 'asc'
			});
			assert.strictEqual(viewData.paginationParams.sortValue, '&sortBy=fileName&order=asc');
		});

		it('should follow a sort link to page one and keep the search and page size', async () => {
			mockReq.query = {
				searchCriteria: 'test & letter',
				page: '2',
				itemsPerPage: '50',
				sortBy: 'uploaded',
				order: 'desc'
			};

			const handler = buildFileSearchView(mockService as any);

			await handler(mockReq as unknown as Request, mockRes as unknown as Response, () => {});

			const firstDbArgs = mockDb.document.findMany.mock.calls[0].arguments[0];
			assert.strictEqual(firstDbArgs.skip, 50);

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			const fileNameHeader = viewData.sortHeaders[0];
			const href = fileNameHeader.html.match(/href="([^"]+)"/)?.[1];

			assert.ok(href, 'File name header should contain a navigation link');

			const sortUrl = new URL(href, 'https://localhost');

			assert.strictEqual(sortUrl.pathname, mockReq.baseUrl);
			assert.strictEqual(sortUrl.searchParams.has('page'), false);
			assert.strictEqual(sortUrl.searchParams.get('itemsPerPage'), '50');
			assert.strictEqual(sortUrl.searchParams.get('searchCriteria'), 'test & letter');
			assert.strictEqual(sortUrl.searchParams.get('sortBy'), 'fileName');
			assert.strictEqual(sortUrl.searchParams.get('order'), 'asc');

			mockReq.query = Object.fromEntries(sortUrl.searchParams);

			await handler(mockReq as unknown as Request, mockRes as unknown as Response, () => {});

			const sortedDbArgs = mockDb.document.findMany.mock.calls[1].arguments[0];

			assert.strictEqual(sortedDbArgs.skip, 0);
			assert.strictEqual(sortedDbArgs.take, 50);
			assert.deepStrictEqual(sortedDbArgs.orderBy, [{ fileName: 'asc' }, { id: 'asc' }]);
			assert.deepStrictEqual(sortedDbArgs.where, firstDbArgs.where);
		});

		it('should keep the search and sorting when moving to the next page', async () => {
			mockReq.query = {
				searchCriteria: 'test & letter',
				sortBy: 'fileName',
				order: 'desc',
				itemsPerPage: '25'
			};

			await buildFileSearchView(mockService as any)(
				mockReq as unknown as Request,
				mockRes as unknown as Response,
				() => {}
			);

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			const nextPage = viewData.paginationParams.uiItems.next;

			assert.ok(nextPage, 'Results should have a next page');

			const nextUrl = new URL(nextPage.href, 'https://localhost');

			assert.strictEqual(nextUrl.pathname, mockReq.baseUrl);
			assert.strictEqual(nextUrl.searchParams.get('page'), '2');
			assert.strictEqual(nextUrl.searchParams.get('searchCriteria'), 'test & letter');
			assert.strictEqual(nextUrl.searchParams.get('sortBy'), 'fileName');
			assert.strictEqual(nextUrl.searchParams.get('order'), 'desc');
			assert.strictEqual(nextUrl.searchParams.get('itemsPerPage'), '25');
		});

		it('should use Uploaded descending when sorting parameters are invalid', async () => {
			mockReq.query.sortBy = 'not-a-column';
			mockReq.query.order = 'not-an-order';

			await buildFileSearchView(mockService as any)(
				mockReq as unknown as Request,
				mockRes as unknown as Response,
				() => {}
			);

			const dbArgs = mockDb.document.findMany.mock.calls[0].arguments[0];
			const viewData = mockRes.render.mock.calls[0].arguments[1];

			assert.deepStrictEqual(dbArgs.orderBy, [{ uploadedDate: 'desc' }, { id: 'asc' }]);
			assert.deepStrictEqual(viewData.sorting, {
				sortBy: 'uploaded',
				order: 'desc'
			});
			assert.strictEqual(viewData.sortHeaders[1].attributes['aria-sort'], 'descending');
			assert.strictEqual(viewData.paginationParams.sortValue, '&sortBy=uploaded&order=desc');
		});
		it('should retain the selected sort when returning to file search', async () => {
			const firstRequest = {
				...mockReq,
				query: {
					searchCriteria: 'letter',
					sortBy: 'fileName',
					order: 'asc'
				}
			} as unknown as Request;

			firstRequest.session.tableSorts = {
				'case-folder': { sortBy: 'uploaded', sortOrder: 'desc' }
			};

			const returnRequest = {
				...firstRequest,
				query: { searchCriteria: 'letter' },
				session: firstRequest.session
			} as Request;

			const handler = buildFileSearchView(mockService as any);
			const expectedOrderBy = [{ fileName: 'asc' }, { id: 'asc' }];

			await handler(firstRequest, mockRes as unknown as Response, () => {});

			assert.deepStrictEqual(mockDb.document.findMany.mock.calls[0].arguments[0].orderBy, expectedOrderBy);
			assert.deepStrictEqual(firstRequest.session.tableSorts, {
				'case-folder': { sortBy: 'uploaded', sortOrder: 'desc' },
				'file-search': { sortBy: 'fileName', sortOrder: 'asc' }
			});

			await handler(returnRequest, mockRes as unknown as Response, () => {});

			assert.strictEqual(mockDb.document.findMany.mock.callCount(), 2);
			assert.strictEqual(mockRes.render.mock.callCount(), 2);
			assert.deepStrictEqual(mockDb.document.findMany.mock.calls[1].arguments[0].orderBy, expectedOrderBy);

			const returnView = mockRes.render.mock.calls[1].arguments[1];

			assert.deepStrictEqual(returnView.sorting, {
				sortBy: 'fileName',
				order: 'asc'
			});
			assert.strictEqual(returnView.sortHeaders[0].attributes['aria-sort'], 'ascending');
			assert.strictEqual(returnView.paginationParams.sortValue, '&sortBy=fileName&order=asc');
		});
	});
});
