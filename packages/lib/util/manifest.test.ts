import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadManifest } from './manifest.ts';
import { mockLogger } from '../testing/mock-logger.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('manifest', () => {
	let tempDir: string;
	let logger: any;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manifest-test-'));
		logger = mockLogger();
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	describe('loadManifest', () => {
		it('should load manifest from file when it exists and is valid JSON', async () => {
			const manifest = { 'style.css': 'style-abc12345.css' };
			await fs.writeFile(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest));

			const result = await loadManifest(tempDir, logger);

			assert.deepEqual(result, { 'style.css': 'style-abc12345.css' });
			assert.equal(logger.warn.mock.callCount(), 0);
		});

		it('should fall back to directory scan when manifest is missing', async () => {
			await fs.writeFile(path.join(tempDir, 'style-def45678.css'), 'body {}');

			const result = await loadManifest(tempDir, logger);

			assert.deepEqual(result, { 'style.css': 'style-def45678.css' });
			assert.equal(logger.warn.mock.callCount(), 1);
			assert.equal(logger.info.mock.callCount(), 1);
		});

		it('should fall back to directory scan when manifest contains invalid JSON', async () => {
			await fs.writeFile(path.join(tempDir, 'manifest.json'), 'not valid json {{{');
			await fs.writeFile(path.join(tempDir, 'style-abc12345.css'), 'body {}');

			const result = await loadManifest(tempDir, logger);

			assert.deepEqual(result, { 'style.css': 'style-abc12345.css' });
			assert.equal(logger.warn.mock.callCount(), 1);
		});

		it('should return empty manifest when manifest file is empty object', async () => {
			await fs.writeFile(path.join(tempDir, 'manifest.json'), '{}');

			const result = await loadManifest(tempDir, logger);

			assert.deepEqual(result, {});
		});
	});

	describe('buildFallbackManifest (via loadManifest)', () => {
		it('should return single style file when only one exists', async () => {
			await fs.writeFile(path.join(tempDir, 'style-abc12345.css'), 'body {}');

			const result = await loadManifest(tempDir, logger);

			assert.deepEqual(result, { 'style.css': 'style-abc12345.css' });
			assert.equal(logger.info.mock.callCount(), 1);
		});

		it('should return newest style file by mtime when multiple exist', async () => {
			// Create files with different modification times (using valid hex hashes)
			await fs.writeFile(path.join(tempDir, 'style-aaa11111.css'), 'body {}');
			await new Promise((resolve) => setTimeout(resolve, 50));
			await fs.writeFile(path.join(tempDir, 'style-bbb22222.css'), 'body {}');
			await new Promise((resolve) => setTimeout(resolve, 50));
			await fs.writeFile(path.join(tempDir, 'style-ccc33333.css'), 'body {}');

			const result = await loadManifest(tempDir, logger);

			assert.deepEqual(result, { 'style.css': 'style-ccc33333.css' });
		});

		it('should return empty manifest when no style files found', async () => {
			await fs.writeFile(path.join(tempDir, 'other.css'), 'body {}');
			await fs.writeFile(path.join(tempDir, 'app.js'), 'console.log()');

			const result = await loadManifest(tempDir, logger);

			assert.deepEqual(result, {});
			assert.equal(logger.info.mock.callCount(), 0);
		});

		it('should return empty manifest and log warning when directory does not exist', async () => {
			const nonExistentDir = path.join(tempDir, 'non-existent');

			const result = await loadManifest(nonExistentDir, logger);

			assert.deepEqual(result, {});
			// Two warnings: one for manifest load failure, one for directory scan failure
			assert.equal(logger.warn.mock.callCount(), 2);
		});

		it('should ignore files that do not match style-[hash].css pattern', async () => {
			await fs.writeFile(path.join(tempDir, 'style.css'), 'body {}'); // no hash
			await fs.writeFile(path.join(tempDir, 'style-GHIJK123.css'), 'body {}'); // uppercase
			await fs.writeFile(path.join(tempDir, 'style-abc12345.css'), 'body {}'); // valid
			await fs.writeFile(path.join(tempDir, 'mystyle-def45678.css'), 'body {}'); // wrong prefix

			const result = await loadManifest(tempDir, logger);

			assert.deepEqual(result, { 'style.css': 'style-abc12345.css' });
		});
	});
});
