import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createUploadedFilesViewModel } from './view-model.ts';

const mockFile1 = {
	id: 'uuid-1234',
	fileName: 'invoice.pdf',
	size: BigInt(1024), // 1 KB
	blobName: 'blob-ref-1'
} as any;

const mockFile2 = {
	id: 'uuid-5678',
	fileName: 'image.png',
	size: BigInt(2048), // 2 KB
	blobName: 'blob-ref-2'
} as any;

describe('createUploadedFilesViewModel', () => {
	it('returns an empty array when no files are provided', () => {
		const result = createUploadedFilesViewModel([]);
		assert.deepStrictEqual(result, []);
	});

	it('maps the file ID to the fileName property (Crucial for Delete logic)', () => {
		const result = createUploadedFilesViewModel([mockFile1]);

		assert.strictEqual(result[0].fileName, 'uuid-1234');
	});

	it('maps the readable filename to originalName', () => {
		const result = createUploadedFilesViewModel([mockFile1]);

		assert.strictEqual(result[0].originalName, 'invoice.pdf');
	});

	it('constructs the success HTML message correctly', () => {
		const result = createUploadedFilesViewModel([mockFile1]);
		const html = result[0].message.html;

		assert.ok(html.includes('invoice.pdf'), 'Should display the readable filename');
		assert.ok(html.includes('moj-multi-file-upload__success'), 'Should have success class');

		assert.ok(html.match(/1.*KB|1024/), 'Should contain formatted size');
	});

	it('correctly sets up the delete button', () => {
		const result = createUploadedFilesViewModel([mockFile1]);

		assert.deepStrictEqual(result[0].deleteButton, {
			text: 'Delete'
		});
	});

	it('handles multiple files correctly', () => {
		const result = createUploadedFilesViewModel([mockFile1, mockFile2]);

		assert.strictEqual(result.length, 2);

		assert.strictEqual(result[0].fileName, 'uuid-1234');
		assert.ok(result[0].message.html.includes('invoice.pdf'));

		assert.strictEqual(result[1].fileName, 'uuid-5678');
		assert.ok(result[1].message.html.includes('image.png'));
	});
});
