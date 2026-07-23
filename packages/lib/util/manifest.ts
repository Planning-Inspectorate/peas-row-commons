import fs from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from 'pino';

export interface Manifest {
	'style.css'?: string;
}

/**
 * Load the manifest.json file from the static directory, which maps logical asset names to their hashed filenames.
 * If the manifest cannot be loaded (e.g. missing or invalid), a fallback manifest is built by scanning the static directory for hashed asset files.
 */
export async function loadManifest(staticDir: string, logger: Logger): Promise<Manifest> {
	const manifestPath = path.join(staticDir, 'manifest.json');
	try {
		const content = await fs.readFile(manifestPath, 'utf8');
		return JSON.parse(content);
	} catch (error) {
		const message = `Failed to load manifest from ${manifestPath}`;
		logger.warn({ error, manifestPath }, message);
		return buildFallbackManifest(staticDir, logger);
	}
}

/**
 * Builds a fallback manifest by scanning the static directory for hashed asset files.
 * Used when manifest.json is missing (e.g., during local development before a full build).
 * Finds the most recently modified style-*.css file to use as the stylesheet.
 */
async function buildFallbackManifest(staticDir: string, logger: Logger): Promise<Manifest> {
	const manifest: Manifest = {};

	try {
		const files = await fs.readdir(staticDir);
		const styleFiles = files.filter((f) => /^style-[a-f0-9]+\.css$/.test(f));

		if (styleFiles.length > 0) {
			// Get newest by modification time
			const styleStats = await Promise.all(
				styleFiles.map(async (f) => ({
					name: f,
					mtime: (await fs.stat(path.join(staticDir, f))).mtimeMs
				}))
			);
			const styleFile = styleStats.sort((a, b) => b.mtime - a.mtime)[0].name;

			manifest['style.css'] = styleFile;
			logger.info({ styleFile }, 'Found style file via directory scan');
		}
	} catch (err) {
		const message = `Failed to scan ${staticDir} for fallback assets`;
		logger.warn({ err, staticDir }, message);
	}

	return manifest;
}
