import { CLOSED_STATUSES } from '@pins/peas-row-commons-lib/constants/statuses.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';
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
			Folder: { id: 'folder-1', displayName: 'My Folder' },
			scanStatus: 'pending',
			...overrides
		}) as any;

	const mockCase = {
		id: 'case-1'
	} as any;

	const statusTag = (text: string, colour: string, dataCy: string) => ({
		text,
		classes: `govuk-tag--${colour}`,
		attributes: { 'data-cy': dataCy }
	});
	const unreadTag = (id: string) => statusTag('Unread', 'blue', `status-unread-${id}`);
	const readTag = (id: string) => statusTag('Read', 'green', `status-read-${id}`);
	const flaggedTag = (id: string) => statusTag('Flagged', 'orange', `status-flagged-${id}`);
	const scanningTag = (id: string) => statusTag('Virus scanning', 'yellow', `status-scanning-${id}`);
	const virusFoundTag = (id: string) => statusTag('Virus found', 'red', `status-virus-found-${id}`);

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

		const result = createDocumentsViewModel(inputDocs, mockCase, PREVIEW_MIME_TYPES);

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

		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);

		assert.strictEqual(result[0].fileType, 'GZ');
		assert.strictEqual(result[1].fileType, 'README');
		assert.strictEqual(result[2].fileType, 'CONFIG');
	});

	it('should handle date formatting with timezone considerations (BST)', () => {
		const summerDate = new Date('2023-07-01T23:30:00Z');
		const docs = [createMockDoc({ uploadedDate: summerDate })];

		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);

		assert.strictEqual(result[0].date, '02 Jul 2023');
	});

	it('should convert BigInt size to Number correctly', () => {
		const bigVal = BigInt(1024 * 1024);
		const docs = [createMockDoc({ size: bigVal })];

		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);

		assert.strictEqual(result[0].sizeSort, 1048576);
		assert.ok(typeof result[0].size === 'string');
	});

	it('should return empty array if no documents provided', () => {
		const result = createDocumentsViewModel([], mockCase, PREVIEW_MIME_TYPES);
		assert.deepStrictEqual(result, []);
	});

	it('should default isRead and isFlagged correctly when UserDocuments is empty or missing', () => {
		const docs = [
			createMockDoc({
				id: '1',
				UserDocuments: []
			}),
			createMockDoc({
				id: '2'
			})
		];

		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);

		assert.strictEqual(result[0].isRead, false);
		assert.strictEqual(result[0].isFlagged, false);

		assert.strictEqual(result[1].isRead, false);
		assert.strictEqual(result[1].isFlagged, false);
	});

	it('should map isRead and isFlagged correctly when a UserDocument state exists', () => {
		const docs = [
			createMockDoc({
				id: '1',
				UserDocuments: [{ readStatus: true, flaggedStatus: false }]
			}),
			createMockDoc({
				id: '2',
				UserDocuments: [{ readStatus: false, flaggedStatus: true }]
			}),
			createMockDoc({
				id: '3',
				UserDocuments: [{ readStatus: true, flaggedStatus: true }]
			})
		];

		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);

		assert.strictEqual(result[0].isRead, true);
		assert.strictEqual(result[0].isFlagged, false);

		assert.strictEqual(result[1].isRead, false);
		assert.strictEqual(result[1].isFlagged, true);

		assert.strictEqual(result[2].isRead, true);
		assert.strictEqual(result[2].isFlagged, true);
	});

	it('should build status tags for each read and flagged combination', () => {
		const docs = [
			createMockDoc({ id: '1', UserDocuments: [{ readStatus: false, flaggedStatus: false }], scanStatus: 'pass' }),
			createMockDoc({ id: '2', UserDocuments: [{ readStatus: true, flaggedStatus: false }], scanStatus: 'pass' }),
			createMockDoc({ id: '3', UserDocuments: [{ readStatus: false, flaggedStatus: true }], scanStatus: 'pass' }),
			createMockDoc({ id: '4', UserDocuments: [{ readStatus: true, flaggedStatus: true }], scanStatus: 'pass' })
		];

		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);

		assert.deepStrictEqual(result[0].statusTags, [unreadTag('1')]);
		assert.deepStrictEqual(result[1].statusTags, [readTag('2')]);
		assert.deepStrictEqual(result[2].statusTags, [unreadTag('3'), flaggedTag('3')]);
		assert.deepStrictEqual(result[3].statusTags, [readTag('4'), flaggedTag('4')]);
	});

	it('should build a virus scanning tag when the document scan status is pending', () => {
		const docs = [createMockDoc({ id: '1', scanStatus: 'pending' })];
		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);
		assert.deepStrictEqual(result[0].statusTags, [scanningTag('1')]);
	});

	it('should build an unread tag when virus scanning is successful', () => {
		const docs = [createMockDoc({ id: '1', scanStatus: 'pass' })];
		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);
		assert.deepStrictEqual(result[0].statusTags, [unreadTag('1')]);
	});

	it('should build a virus found tag when virus scanning fails', () => {
		const docs = [createMockDoc({ id: '1', scanStatus: 'fail' })];
		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);
		assert.deepStrictEqual(result[0].statusTags, [virusFoundTag('1')]);
	});

	it('should append flagged after the scan tag regardless of read status', () => {
		const docs = [
			createMockDoc({ id: '1', scanStatus: 'pending', UserDocuments: [{ readStatus: true, flaggedStatus: true }] }),
			createMockDoc({ id: '2', scanStatus: 'pending', UserDocuments: [{ readStatus: false, flaggedStatus: true }] }),
			createMockDoc({ id: '3', scanStatus: 'fail', UserDocuments: [{ readStatus: true, flaggedStatus: true }] }),
			createMockDoc({ id: '4', scanStatus: 'fail', UserDocuments: [{ readStatus: false, flaggedStatus: true }] })
		];
		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);
		const expectedScanTags = [scanningTag('1'), scanningTag('2'), virusFoundTag('3'), virusFoundTag('4')];

		for (const [index, doc] of docs.entries()) {
			assert.deepStrictEqual(result[index].statusTags, [expectedScanTags[index], flaggedTag(doc.id)]);
		}
	});

	it('should build a virus scanning tag when no scan status is passed', () => {
		const docs = [createMockDoc({ id: '1', scanStatus: undefined })];
		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);
		assert.deepStrictEqual(result[0].statusTags, [scanningTag('1')]);
	});

	it('should build a virus scanning tag when bad scan status is passed', () => {
		const docs = [createMockDoc({ id: '1', scanStatus: 'not-a-real-status' })];
		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);
		assert.deepStrictEqual(result[0].statusTags, [scanningTag('1')]);
	});

	it('should build tags using default status when no user document exists', () => {
		const docs = [createMockDoc({ id: '1', UserDocuments: [], scanStatus: 'pass' })];
		const result = createDocumentsViewModel(docs, mockCase, PREVIEW_MIME_TYPES);

		assert.deepStrictEqual(result[0].statusTags, [unreadTag('1')]);
	});

	it('should use the read default for closed migrated cases', () => {
		const docs = [createMockDoc({ id: '1', UserDocuments: [], scanStatus: 'pass' })];
		const result = createDocumentsViewModel(
			docs,
			{ ...mockCase, legacyCaseId: 'legacy-1', statusId: CLOSED_STATUSES[0] },
			PREVIEW_MIME_TYPES
		);

		assert.deepStrictEqual(result[0].statusTags, [readTag('1')]);
	});
});
