import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentsViewModel } from './view-model.ts';

describe('createDocumentsViewModel', () => {
	const createMockDoc = (overrides = {}) =>
		({
			id: 'doc-123',
			fileName: 'evidence.pdf',
			size: BigInt(1024),
			uploadedDate: new Date('2023-10-25T10:00:00Z'),
			blobName: 'path/to/blob',
			caseId: 'case-1',
			folderId: 'folder-1',
			mimeType: 'application/pdf',
			...overrides
		}) as any;

	it('should map Prisma documents to view models correctly', () => {
		const inputDocs = [
			createMockDoc({
				id: '1',
				fileName: 'test.png',
				size: BigInt(500),
				uploadedDate: new Date('2023-01-01T12:00:00Z')
			}),
			createMockDoc({
				id: '2',
				fileName: 'report.docx',
				size: BigInt(2000),
				uploadedDate: new Date('2023-12-31T12:00:00Z')
			})
		];

		const result = createDocumentsViewModel(inputDocs);

		assert.strictEqual(result.length, 2);

		assert.strictEqual(result[0].id, '1');
		assert.strictEqual(result[0].fileName, 'test.png');
		assert.strictEqual(result[0].fileType, 'PNG');
		assert.ok(result[0].size.includes('500'));
		assert.strictEqual(result[0].sizeSort, 500);
		assert.strictEqual(result[0].date, '01 Jan 2023');
		assert.strictEqual(result[0].dateSort, new Date('2023-01-01T12:00:00Z').getTime());

		assert.strictEqual(result[1].id, '2');
		assert.strictEqual(result[1].fileType, 'DOCX');
		assert.ok(result[1].size.includes('2'));
		assert.strictEqual(result[1].date, '31 Dec 2023');
	});

	it('should handle file extensions correctly', () => {
		const docs = [
			createMockDoc({ fileName: 'archive.tar.gz' }),
			createMockDoc({ fileName: 'README' }),
			createMockDoc({ fileName: '.config' })
		];

		const result = createDocumentsViewModel(docs);

		assert.strictEqual(result[0].fileType, 'GZ');
		assert.strictEqual(result[1].fileType, 'README');
		assert.strictEqual(result[2].fileType, 'CONFIG');
	});

	it('should handle date formatting with timezone considerations (BST)', () => {
		const summerDate = new Date('2023-07-01T23:30:00Z');
		const docs = [createMockDoc({ uploadedDate: summerDate })];

		const result = createDocumentsViewModel(docs);

		assert.strictEqual(result[0].date, '02 Jul 2023');
	});

	it('should convert BigInt size to Number correctly', () => {
		const bigVal = BigInt(1024 * 1024);
		const docs = [createMockDoc({ size: bigVal })];

		const result = createDocumentsViewModel(docs);

		assert.strictEqual(result[0].sizeSort, 1048576);
		assert.ok(typeof result[0].size === 'string');
	});

	it('should return empty array if no documents provided', () => {
		const result = createDocumentsViewModel([]);
		assert.deepStrictEqual(result, []);
	});
});
