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
});
