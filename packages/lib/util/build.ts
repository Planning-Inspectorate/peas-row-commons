import * as sass from 'sass';
import path from 'node:path';
import fs from 'node:fs/promises';
import { copyFile, copyFolder } from './copy.ts';
import crypto from 'node:crypto';

interface SassOptions {
	staticDir: string;
	srcDir: string;
	govUkRoot: string;
	/**
	 * a file to update with the new css filename
	 */
	localsFile?: string;
	mojRoot: string;
}

/**
 * Compile sass into a css file in the .static folder
 * Optionally, update a file which contains the css file name
 *
 * @see https://sass-lang.com/documentation/js-api/#md:usage
 */
async function compileSass({ staticDir, srcDir, govUkRoot, localsFile, mojRoot }: SassOptions): Promise<void> {
	const styleFile = path.join(srcDir, 'app', 'sass/style.scss');
	const out = sass.compile(styleFile, {
		// ensure scss can find the govuk-frontend folders
		loadPaths: [govUkRoot, mojRoot],
		style: 'compressed',
		// don't show depreciate warnings for govuk
		// see https://frontend.design-system.service.gov.uk/importing-css-assets-and-javascript/#silence-deprecation-warnings-from-dependencies-in-dart-sass
		quietDeps: true
	});
	// cache-busting: generate a filename for the css based on the content
	const hash = crypto.createHash('sha256').update(out.css).digest('hex').slice(0, 8);
	const filename = `style-${hash}.css`;
	const outputPath = path.join(staticDir, filename);
	// make sure the static directory exists
	await fs.mkdir(staticDir, { recursive: true });
	// write the css file
	await fs.writeFile(outputPath, out.css);

	if (localsFile) {
		// update the given file with the new css filename
		await replaceInFile(localsFile, [
			{
				replace: /'style(-[0-9a-f]{8})?\.css'/,
				with: `'${filename}'`
			}
		]);
	}
	await deleteOldCssFiles({ staticDir, filename });
}

/**
 * Delete any old style.css and style-${hash}.css files
 *
 * @param staticDir
 * @param filename
 */
async function deleteOldCssFiles({ staticDir, filename }: { staticDir: string; filename: string }) {
	const files = await fs.readdir(staticDir);
	const oldStyleFiles = files.filter(
		(file) => file !== filename && file.endsWith('.css') && file.match(/^style(-[0-9a-f]{8})?\.css$/)
	);
	const deleteTasks = [];
	for (const file of oldStyleFiles) {
		deleteTasks.push(fs.unlink(path.join(staticDir, file)));
	}
	await Promise.all(deleteTasks);
}

interface AssetOptions {
	staticDir: string;
	govUkRoot: string;
	mojRoot: string;
}

/**
 * Copy govuk assets into the .static folder
 *
 * @see https://frontend.design-system.service.gov.uk/importing-css-assets-and-javascript/#copy-the-font-and-image-files-into-your-application
 * @returns {Promise<void>}
 */
async function copyAssets({ staticDir, govUkRoot, mojRoot }: AssetOptions): Promise<void> {
	const images = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/images');
	const fonts = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/fonts');
	const js = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.js');
	const manifest = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/manifest.json');
	const rebrand = path.join(govUkRoot, 'node_modules/govuk-frontend/dist/govuk/assets/rebrand');

	const staticImages = path.join(staticDir, 'assets', 'images');
	const staticFonts = path.join(staticDir, 'assets', 'fonts');
	const staticJs = path.join(staticDir, 'assets', 'js', 'govuk-frontend.min.js');
	const staticManifest = path.join(staticDir, 'assets', 'manifest.json');
	const staticRebrand = path.join(staticDir, 'assets', 'rebrand');

	// copy all images and fonts for govuk-frontend
	await copyFolder(images, staticImages);
	await copyFolder(fonts, staticFonts);
	await copyFile(js, staticJs);
	await copyFile(manifest, staticManifest);
	await copyFolder(rebrand, staticRebrand);

	const mojImages = path.join(mojRoot, 'node_modules/@ministryofjustice/frontend/moj/assets/images');
	const mojJs = path.join(mojRoot, 'node_modules/@ministryofjustice/frontend/moj/moj-frontend.min.js');
	const staticMojJs = path.join(staticDir, 'assets', 'js', 'moj-frontend.min.js');
	// copy images and js for @ministryofjustice/frontend
	await copyFolder(mojImages, staticImages);
	await copyFile(mojJs, staticMojJs);
}

interface AutocompleteOptions {
	staticDir: string;
	root: string;
}

/**
 * Copy accessible-autocomplete assets into the .static folder
 */
async function copyAutocompleteAssets({ staticDir, root }: AutocompleteOptions): Promise<void> {
	const js = path.join(root, 'accessible-autocomplete.min.js');
	const css = path.join(root, 'accessible-autocomplete.min.css');

	const staticJs = path.join(staticDir, 'assets', 'js', 'accessible-autocomplete.min.js');
	const staticCss = path.join(staticDir, 'assets', 'css', 'accessible-autocomplete.min.css');

	await copyFile(js, staticJs);
	await copyFile(css, staticCss);
}

interface BuildOptions {
	staticDir: string;
	srcDir: string;
	govUkRoot: string;
	accessibleAutocompleteRoot?: string;
	localsFile?: string;
	mojRoot: string;
}

interface Replacement {
	replace: string | RegExp;
	with: string;
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
		if (replacement.replace instanceof RegExp) {
			newContent = newContent.replace(replacement.replace, replacement.with);
		} else {
			newContent = newContent.replaceAll(replacement.replace, replacement.with);
		}
	}
	await fs.writeFile(file, newContent, 'utf8');
}

/**
 * Do all steps to run the build
 */
export function runBuild({
	staticDir,
	srcDir,
	govUkRoot,
	accessibleAutocompleteRoot,
	localsFile,
	mojRoot
}: BuildOptions): Promise<void[]> {
	const tasks = [
		compileSass({ staticDir, srcDir, govUkRoot, localsFile, mojRoot }),
		copyAssets({ staticDir, govUkRoot, mojRoot })
	];
	if (accessibleAutocompleteRoot) {
		tasks.push(copyAutocompleteAssets({ staticDir, root: accessibleAutocompleteRoot }));
	}
	return Promise.all(tasks);
}
