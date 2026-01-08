import { createRequire } from 'node:module';
import path from 'node:path';
import nunjucks from 'nunjucks';
import { loadBuildConfig } from './config.ts';

/**
 * Configure nunjucks with govuk and app folders for loading views
 */
export function configureNunjucks(): nunjucks.Environment {
	const config = loadBuildConfig();

	// get the require function, see https://nodejs.org/api/module.html#modulecreaterequirefilename
	const require = createRequire(import.meta.url);
	// path to dynamic forms folder
	const dynamicFormsRoot = path.resolve(require.resolve('@planning-inspectorate/dynamic-forms'), '..');
	// get the path to the govuk-frontend folder, in node_modules, using the node require resolution
	const govukFrontendRoot = path.resolve(require.resolve('govuk-frontend'), '../..');
	// get the path to the moj frontend folder in node_modules, using the node require resolution
	const mojFrontendRoot = path.resolve(require.resolve('@ministryofjustice/frontend'), '../..');
	const customFormsRoot = path.resolve(require.resolve('@pins/peas-row-commons-lib'), '..', 'forms');
	const appDir = path.join(config.srcDir, 'app');

	// configure nunjucks
	return nunjucks.configure(
		// ensure nunjucks templates can use govuk-frontend components, and templates we've defined in `web/src/app`
		[dynamicFormsRoot, govukFrontendRoot, appDir, mojFrontendRoot, customFormsRoot],
		{
			// output with dangerous characters are escaped automatically
			autoescape: true,
			// automatically remove trailing newlines from a block/tag
			trimBlocks: true,
			// automatically remove leading whitespace from a block/tag
			lstripBlocks: true
		}
	);
}
