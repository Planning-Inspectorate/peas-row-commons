import path from 'node:path';
import { createRequire } from 'node:module';
import { loadBuildConfig } from '../app/config.ts';
import { runBuild } from '@pins/peas-row-commons-lib/util/build.ts';

/**
 * Do all steps to run the build
 */
async function run(): Promise<void> {
	const require = createRequire(import.meta.url);
	// resolves to <root>/node_modules/govuk-frontend/dist/govuk/all.bundle.js then maps to `<root>`
	const repoRoot = path.resolve(require.resolve('govuk-frontend'), '../../../../..');
	// resolves to <root>/node_modules/accessible-autocomplete/dist/*.js then maps to `dist`
	const accessibleAutocompleteRoot = path.resolve(require.resolve('accessible-autocomplete'), '..');
	// resolves to <root>/node_modules/@ministryofjustice/frontend/moj/all.bundle.js then maps to `<root>`
	const mojRoot = path.resolve(require.resolve('@ministryofjustice/frontend'), '../../../../..');

	const config = loadBuildConfig();

	await runBuild({
		staticDir: config.staticDir,
		srcDir: config.srcDir,
		repoRoot,
		accessibleAutocompleteRoot,
		mojRoot
	});
}

// run the build, and write any errors to console
run().catch((err) => {
	console.error(err);
	throw err;
});
