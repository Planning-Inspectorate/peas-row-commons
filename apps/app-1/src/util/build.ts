import path from 'node:path';
import { createRequire } from 'node:module';
import { loadBuildConfig } from '../app/config.ts';
import { runBuild } from '@pins/peas-row-commons-lib/util/build.ts';

/**
 * Do all steps to run the build
 */
async function run(): Promise<void> {
	const require = createRequire(import.meta.url);
	// resolves to <root>/node_modules/govuk-frontend/dist/govuk/all.bundle.js than maps to `<root>`
	const govUkRoot = path.resolve(require.resolve('govuk-frontend'), '../../../../..');

	const config = loadBuildConfig();
	const localsFile = path.join(config.srcDir, 'util', 'config-middleware.ts');
	await runBuild({ staticDir: config.staticDir, srcDir: config.srcDir, govUkRoot, localsFile });
}

// run the build, and write any errors to console
run().catch((err) => {
	console.error(err);
	throw err;
});
