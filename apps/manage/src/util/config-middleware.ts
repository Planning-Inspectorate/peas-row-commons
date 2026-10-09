import type { Manifest } from '@pins/peas-row-commons-lib/util/manifest.ts';
import type { Handler } from 'express';

type manifestKeys = keyof Manifest;
/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(manifest: Manifest, changeAuthorityEmail?: string): Handler {
	return (req, res, next) => {
		res.locals.config = {
			headerTitle: 'MPESC',
			footerLinks: [
				{
					text: 'Report a problem',
					link: 'https://mhclg.service-now.com/sp/?id=landing'
				}
			],
			manifest: mapManifest(manifest)
		};
		// set a global variable for Nunjucks, used by the select-authority component
		res.locals.changeAuthorityEmail = changeAuthorityEmail;
		next();
	};
}

function mapManifest(manifest: Manifest) {
	function resolveManifest(manifest: Manifest, key: manifestKeys): string {
		return manifest[key] ?? key;
	}

	return {
		styleFile: resolveManifest(manifest, 'style.css'),
		govukJsFile: resolveManifest(manifest, 'govuk-frontend.min.js'),
		mojJsFile: resolveManifest(manifest, 'moj-frontend.min.js'),
		autocompleteStyleFile: resolveManifest(manifest, 'accessible-autocomplete.min.css'),
		autocompleteJsFile: resolveManifest(manifest, 'accessible-autocomplete.min.js')
	};
}
