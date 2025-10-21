import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Replacement {
	replace: string;
	with: string;
}

/**
 * This script must be run before function build.
 *
 * This function replaces references to workspace packages with a subpath import,
 * these are defined in `package.json#imports`. This is because  Node will only run TypeScript
 * code for the project, not from node_modules
 *
 * The function build pipeline copies these packages into the directories listed in the packages.json file,
 * and also runs this script to replace imports.
 */
async function replaceLocalPackages() {
	const files = await getFiles(path.join(__dirname));

	const srcFiles = files.filter(isSourceFile);
	for (const srcFile of srcFiles) {
		await replaceInFile(srcFile, [
			{ replace: '@pins/peas-row-commons-lib', with: '#pins/peas-row-commons-lib' },
			{ replace: '@pins/peas-row-commons-database', with: '#pins/peas-row-commons-database' }
		]);
	}
}

/**
 * Replace content in files and overwrite them
 *
 * @param file
 * @param replacements
 */
async function replaceInFile(file: string, replacements: Replacement[]) {
	let newContent = await fs.readFile(file, 'utf8');
	for (const replacement of replacements) {
		newContent = newContent.replaceAll(replacement.replace, replacement.with);
	}
	await fs.writeFile(file, newContent, 'utf8');
}

/**
 * Is the filename given a source file?
 * Excludes this file.
 * @param f
 */
function isSourceFile(f: string) {
	if (f === __filename) {
		return false;
	}
	if (f.endsWith('.test.js') || f.endsWith('.test.ts')) {
		return false;
	}
	if (f.endsWith('.d.ts')) {
		return false;
	}
	return f.endsWith('.js') || f.endsWith('.ts');
}

/**
 * Get all files recursively
 *
 * @param dir
 */
async function getFiles(dir: string): Promise<string[]> {
	const subdirs = await fs.readdir(dir);
	const files = await Promise.all(
		subdirs.map(async (subdir: string): Promise<string[]> => {
			const res = path.resolve(dir, subdir);
			return (await fs.stat(res)).isDirectory() ? getFiles(res) : [res];
		})
	);
	return files.reduce((a, f) => a.concat(f), []);
}

replaceLocalPackages().catch(console.error);
