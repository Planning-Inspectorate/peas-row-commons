import { runBuild } from '@planning-inspectorate/core/util';
import { createRequire } from 'node:module';
import path from 'node:path';
import { loadBuildConfig } from '../app/config.ts';

/**
 * Do all steps to run the build
 */
async function run(): Promise<void> {
	const require = createRequire(import.meta.url);
	// resolves to <root>/node_modules/govuk-frontend/dist/govuk/all.bundle.js then maps to `<root>`
	const repoRoot = path.resolve(require.resolve('govuk-frontend'), '../../../../..');
	// resolves to <root>/node_modules/accessible-autocomplete/dist/*.js then maps to `dist`
	const accessibleAutocompleteRoot = path.resolve(require.resolve('accessible-autocomplete'), '..');

	const config = loadBuildConfig();

	await runBuild({
		staticDir: config.staticDir,
		srcDir: config.srcDir,
		repoRoot,
		accessibleAutocompleteRoot,
		copyMoj: true
	});
}

// run the build, and write any errors to console
run().catch((err) => {
	console.error(err);
	throw err;
});
