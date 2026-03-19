import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateUniqueFilename, isolateFileNameFromExtension } from './files.ts';

describe('files', () => {
	describe('generateUniqueFilename', () => {
		let seenFileNames: Set<string>;

		beforeEach(() => {
			seenFileNames = new Set<string>();
		});

		it('should return the original filename and add it to the set if not seen', () => {
			const result = generateUniqueFilename('report.pdf', seenFileNames);

			assert.strictEqual(result, 'report.pdf');
			assert.strictEqual(seenFileNames.has('report.pdf'), true);
		});

		it('should append (1) if the exact filename already exists', () => {
			generateUniqueFilename('report.pdf', seenFileNames);
			const result = generateUniqueFilename('report.pdf', seenFileNames);

			assert.strictEqual(result, 'report (1).pdf');
			assert.strictEqual(seenFileNames.has('report (1).pdf'), true);
		});

		it('should increment the counter for multiple duplicates', () => {
			generateUniqueFilename('report.pdf', seenFileNames);
			generateUniqueFilename('report.pdf', seenFileNames);
			const result = generateUniqueFilename('report.pdf', seenFileNames);

			assert.strictEqual(result, 'report (2).pdf');
		});

		it('should handle filenames with multiple dots correctly', () => {
			generateUniqueFilename('my.final.report.docx', seenFileNames);
			const result = generateUniqueFilename('my.final.report.docx', seenFileNames);

			assert.strictEqual(result, 'my.final.report (1).docx');
		});

		it('should handle filenames with absolutely no extension', () => {
			generateUniqueFilename('README', seenFileNames);
			const result = generateUniqueFilename('README', seenFileNames);

			assert.strictEqual(result, 'README (1)');
		});
	});

	describe('isolateFileNameFromExtension', () => {
		it('should handle filenames with multiple dots correctly', () => {
			const result = isolateFileNameFromExtension('my.final.report.docx');

			assert.deepEqual(result, ['my.final.report', '.docx']);
		});

		it('should handle filenames with absolutely no extension', () => {
			const result = isolateFileNameFromExtension('README');

			assert.deepEqual(result, ['README', '']);
		});
	});
});
