import { createRequire } from 'node:module';
import path from 'node:path';
import nunjucks, { type Environment } from 'nunjucks';
import { format } from 'date-fns';
import { loadBuildConfig } from './config.ts';
import { GENERAL_CONSTANTS } from '@pins/peas-row-commons-lib/constants/general.ts';

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
	const libUi = path.resolve(require.resolve('@pins/peas-row-commons-lib'), '..');
	const appDir = path.join(config.srcDir, 'app');

	// configure nunjucks
	const env = nunjucks.configure(
		// ensure nunjucks templates can use govuk-frontend components, and templates we've defined in `web/src/app`
		[dynamicFormsRoot, govukFrontendRoot, appDir, mojFrontendRoot, customFormsRoot, libUi],
		{
			// output with dangerous characters are escaped automatically
			autoescape: true,
			// automatically remove trailing newlines from a block/tag
			trimBlocks: true,
			// automatically remove leading whitespace from a block/tag
			lstripBlocks: true
		}
	);

	registerFilters(env);

	return env;
}

/**
 * Registers all custom Nunjucks filters.
 */
function registerFilters(env: Environment): void {
	/**
	 * Formats a date value into a human-readable string.
	 *
	 * Accepts ISO strings, Date objects, or timestamps.
	 * Returns 'N/A' for null/undefined values.
	 */
	env.addFilter('date', (value: string | Date | number | null | undefined, formatStr: string): string => {
		if (value === null || value === undefined) {
			return GENERAL_CONSTANTS.NOT_APPLICABLE;
		}

		try {
			const dateObj = value instanceof Date ? value : new Date(value);

			// Guard against invalid dates (NaN timestamp)
			if (isNaN(dateObj.getTime())) {
				return GENERAL_CONSTANTS.NOT_APPLICABLE;
			}

			return format(dateObj, formatStr);
		} catch {
			return GENERAL_CONSTANTS.NOT_APPLICABLE;
		}
	});

	/**
	 * Converts a value to 'Yes' or 'No'.
	 */
	env.addFilter('yesNo', (value: boolean | null | undefined): string => {
		if (value === true) return 'Yes';
		if (value === false) return 'No';
		return GENERAL_CONSTANTS.NOT_APPLICABLE;
	});

	/**
	 * Provides a fallback value when the input is null, undefined, or empty string.
	 */
	env.addFilter('fallback', (value: unknown, fallbackText: string = GENERAL_CONSTANTS.NOT_APPLICABLE): string => {
		if (value === null || value === undefined || value === '') {
			return fallbackText;
		}

		return String(value);
	});
}
