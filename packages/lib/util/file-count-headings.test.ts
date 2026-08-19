import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCountHeading } from './file-count-headings.ts';

describe('getCountHeading', () => {
	const config = {
		zeroFiles: 'No files selected to move',
		oneFile: 'Move 1 file',
		multipleFiles: (count: number) => `Move ${count} files`
	};

	it('should return the zeroFiles heading when count is 0', () => {
		assert.strictEqual(getCountHeading(0, config), 'No files selected to move');
	});

	it('should return the oneFile heading when count is 1', () => {
		assert.strictEqual(getCountHeading(1, config), 'Move 1 file');
	});

	it('should return the multipleFiles heading when count is greater than 1', () => {
		assert.strictEqual(getCountHeading(2, config), 'Move 2 files');
	});

	it('should pass the count to the multipleFiles formatter', () => {
		assert.strictEqual(getCountHeading(27, config), 'Move 27 files');
	});
});
