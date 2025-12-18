import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { validateUploadedFile } from './validation-util.ts';

const createMockFile = (overrides = {}) => ({
	fieldname: 'file',
	originalname: 'test.pdf',
	encoding: '7bit',
	mimetype: 'application/pdf',
	buffer: Buffer.from('%PDF-1.7 data'), // Minimal PDF signature
	size: 100,
	destination: '/tmp',
	filename: 'test.pdf',
	path: '/tmp/test.pdf',
	stream: null as any,
	...overrides
});

/**
 * Special data formats creating real Buffers to mimic
 * the files we could get. With minimum bytes to be those files
 */
const MAGIC_BYTES = {
	PDF: Buffer.from('%PDF-1.7\n\n%%EOF'),

	PNG: Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		Buffer.from([0x00, 0x00, 0x00, 0x0d]),
		Buffer.from('IHDR'),
		Buffer.alloc(17)
	]),

	ZIP: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(26)]),

	EXE: Buffer.from([0x4d, 0x5a])
};

describe('validateUploadedFile', () => {
	const logger = {
		warn: mock.fn(),
		error: mock.fn(),
		info: mock.fn(),
		debug: mock.fn()
	} as any;

	const allowedMimeTypes = ['application/pdf', 'image/png', 'application/msword'];
	const allowedExtensions = ['pdf', 'png', 'doc'];
	const maxFileSize = 1024 * 1024; // 1MB

	describe('Basic Attributes', () => {
		it('should return error if file is empty (size 0)', async () => {
			const file = createMockFile({ size: 0, buffer: Buffer.from('') });
			const errors = await validateUploadedFile(file, logger, allowedExtensions, allowedMimeTypes, maxFileSize);

			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /empty/);
		});

		it('should return error if file exceeds max size', async () => {
			const file = createMockFile({ size: maxFileSize + 1 });
			const errors = await validateUploadedFile(file, logger, allowedExtensions, allowedMimeTypes, maxFileSize);

			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /must be smaller than/);
		});

		it('should return error if filename is too long', async () => {
			const longName = 'a'.repeat(256) + '.pdf';
			const file = createMockFile({ originalname: longName });
			const errors = await validateUploadedFile(file, logger, allowedExtensions, allowedMimeTypes, maxFileSize);

			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /exceeds the 255 character limit/);
		});

		it('should return error if filename contains em-dash or en-dash', async () => {
			const file = createMockFile({ originalname: 'file–name.pdf' });
			const errors = await validateUploadedFile(file, logger, allowedExtensions, allowedMimeTypes, maxFileSize);

			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /special characters/);
		});
	});

	describe('MIME and Extension Checks', () => {
		it('should return error if MIME type is not in allow list', async () => {
			const file = createMockFile({
				mimetype: 'application/x-bad',
				originalname: 'test.bad'
			});
			const errors = await validateUploadedFile(file, logger, allowedExtensions, allowedMimeTypes, maxFileSize);

			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /must be/);
		});

		it('should fail if fileTypeFromBuffer cannot detect signature (random bytes)', async () => {
			const file = createMockFile({
				buffer: Buffer.from('just random text string that is not a file signature')
			});
			const errors = await validateUploadedFile(file, logger, allowedExtensions, allowedMimeTypes, maxFileSize);

			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /Could not determine file type/);
		});
	});

	describe('Spoofing and Signatures', () => {
		it('should return error if file is a ZIP (banned globally)', async () => {
			const file = createMockFile({
				originalname: 'archive.pdf',
				mimetype: 'application/pdf',
				buffer: MAGIC_BYTES.ZIP
			});

			const errors = await validateUploadedFile(file, logger, allowedExtensions, allowedMimeTypes, maxFileSize);

			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /must not be a zip file/);
		});

		it('should return error if extension matches but signature does not (Spoofing)', async () => {
			const file = createMockFile({
				originalname: 'image.png',
				mimetype: 'image/png',
				buffer: MAGIC_BYTES.EXE
			});

			const errors = await validateUploadedFile(file, logger, allowedExtensions, allowedMimeTypes, maxFileSize);

			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /File signature mismatch/);
		});

		it('should pass if extension and signature match', async () => {
			const file = createMockFile({
				originalname: 'image.png',
				mimetype: 'image/png',
				buffer: MAGIC_BYTES.PNG
			});

			const errors = await validateUploadedFile(file, logger, allowedExtensions, allowedMimeTypes, maxFileSize);

			assert.deepStrictEqual(errors, []);
		});
	});

	describe('Special Formats (Text based)', () => {
		it('should fail invalid HTML', async () => {
			const file = createMockFile({
				originalname: 'test.html',
				mimetype: 'text/html',
				buffer: Buffer.from('Just some text')
			});

			// Allow html for this specific test
			const errors = await validateUploadedFile(file, logger, ['html'], ['text/html'], maxFileSize);

			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /not a valid .html file/);
		});

		it('should pass valid HTML', async () => {
			const file = createMockFile({
				originalname: 'test.html',
				mimetype: 'text/html',
				buffer: Buffer.from('<!DOCTYPE html><html><body></body></html>')
			});

			const errors = await validateUploadedFile(file, logger, ['html'], ['text/html'], maxFileSize);
			assert.deepStrictEqual(errors, []);
		});

		it('should fail invalid PRJ', async () => {
			const file = createMockFile({
				originalname: 'test.prj',
				mimetype: 'text/plain',
				buffer: Buffer.from('Invalid content')
			});

			const errors = await validateUploadedFile(file, logger, ['prj'], ['text/plain'], maxFileSize);
			assert.strictEqual(errors.length, 1);
			assert.match(errors[0].text, /not a valid .prj file/);
		});
	});
});
