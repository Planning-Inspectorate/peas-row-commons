import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { buildFileSearchView } from './controller.ts';

describe('File Search View Controller', () => {
	let mockReq: any;
	let mockRes: any;
	let mockDb: any;
	let mockService: any;

	beforeEach(() => {
		mockReq = {
			params: { id: 'case-123' },
			query: {},
			baseUrl: '/cases/case-123/case-folders/search-results',
			path: '/'
		};

		mockRes = {
			render: mock.fn(),
			redirect: mock.fn(),
			send: mock.fn(),
			status: mock.fn()
		};

		mockRes.status.mock.mockImplementation(() => mockRes);

		mockDb = {
			document: {
				count: mock.fn(),
				findMany: mock.fn()
			},
			$transaction: mock.fn(async (promises: Promise<any>[]) => Promise.all(promises))
		};

		mockService = {
			db: mockDb
		};
	});

	it('should render empty results without querying DB if search string is empty', async () => {
		mockReq.query.searchCriteria = '';

		const handler = buildFileSearchView(mockService);
		await handler(mockReq, mockRes, () => {});

		assert.strictEqual(mockDb.document.count.mock.callCount(), 0);
		assert.strictEqual(mockDb.document.findMany.mock.callCount(), 0);
		assert.strictEqual(mockDb.$transaction.mock.callCount(), 0);

		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		const [view, data] = mockRes.render.mock.calls[0].arguments;

		assert.strictEqual(view, 'views/cases/case-folders/search-files/view.njk');
		assert.strictEqual(data.paginationParams.totalDocuments, 0);
		assert.deepStrictEqual(data.documents, []);
		assert.strictEqual(data.searchValue, '');
	});

	it('should query DB and render results if search string is provided', async () => {
		mockReq.query.searchCriteria = 'letter';

		mockDb.document.count.mock.mockImplementation(() => Promise.resolve(2));
		mockDb.document.findMany.mock.mockImplementation(() =>
			Promise.resolve([
				{
					id: 'doc-1',
					fileName: 'letter_A.pdf',
					uploadedDate: new Date(),
					size: 1024,
					mimeType: 'application/pdf',
					Folder: { id: 'f1', displayName: 'General' }
				},
				{
					id: 'doc-2',
					fileName: 'letter_B.pdf',
					uploadedDate: new Date(),
					size: 2048,
					mimeType: 'application/pdf',
					Folder: { id: 'f1', displayName: 'General' }
				}
			])
		);

		const handler = buildFileSearchView(mockService);
		await handler(mockReq, mockRes, () => {});

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
