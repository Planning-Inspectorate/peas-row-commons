import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, encodeBlobNameToBase64, formatExtensions } from './upload.ts';

describe('Utility Functions', () => {
	describe('formatBytes', () => {
		it('should return "0B" for 0 bytes', () => {
			assert.strictEqual(formatBytes(0), '0B');
		});

		it('should format bytes to B correctly', () => {
			assert.strictEqual(formatBytes(500), '500B');
		});

		it('should format bytes to KB correctly (1024 boundary)', () => {
			assert.strictEqual(formatBytes(1024), '1KB');
		});

		it('should round correctly (1.4KB -> 1KB)', () => {
			// 1024 + 400 = 1424 bytes. 1424/1024 = 1.39 -> rounds to 1
			assert.strictEqual(formatBytes(1424), '1KB');
		});

		it('should round correctly (1.6KB -> 2KB)', () => {
			// 1024 + 600 = 1624 bytes. 1624/1024 = 1.58 -> rounds to 2
			assert.strictEqual(formatBytes(1624), '2KB');
		});

		it('should format bytes to MB correctly', () => {
			const oneMB = 1024 * 1024;
			assert.strictEqual(formatBytes(oneMB), '1MB');
			assert.strictEqual(formatBytes(oneMB * 2.5), '3MB'); // Rounds 2.5 up to 3
		});

		it('should format bytes to GB correctly', () => {
			const oneGB = 1024 * 1024 * 1024;
			assert.strictEqual(formatBytes(oneGB), '1GB');
		});
	});

	describe('encodeBlobNameToBase64', () => {
		it('should encode a simple string to base64url', () => {
			const input = 'hello world';
			const expected = 'aGVsbG8gd29ybGQ';
			assert.strictEqual(encodeBlobNameToBase64(input), expected);
		});

		it('should handle characters that differ between base64 and base64url', () => {
			// Base64URL uses '-' and '_' NOT + and /
			const input = '??>>//';
			const expected = 'Pz8-Pi8v';

			assert.strictEqual(encodeBlobNameToBase64(input), expected);
			assert.doesNotMatch(encodeBlobNameToBase64(input), /\+/);
			assert.doesNotMatch(encodeBlobNameToBase64(input), /\//);
		});
	});

	describe('formatExtensions', () => {
		it('should return empty string for empty array', () => {
			assert.strictEqual(formatExtensions([]), '');
		});

		it('should return single extension uppercased', () => {
			assert.strictEqual(formatExtensions(['pdf']), 'PDF');
		});

		it('should format two extensions with "or"', () => {
			assert.strictEqual(formatExtensions(['pdf', 'jpg']), 'PDF, or JPG');
		});

		it('should format multiple extensions with commas and "or"', () => {
			assert.strictEqual(formatExtensions(['pdf', 'doc', 'docx']), 'PDF, DOC, or DOCX');
		});

		it('should handle mixed case inputs', () => {
			assert.strictEqual(formatExtensions(['Pdf', 'PnG']), 'PDF, or PNG');
		});
	});
});
