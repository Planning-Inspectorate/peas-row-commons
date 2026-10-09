import type { Manifest } from '@pins/peas-row-commons-lib/util/manifest.ts';
import type { Handler } from 'express';

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
			manifest: {
				styleFile: manifest['style.css'] ?? 'style.css',
				govukJsFile: manifest['govuk-frontend.min.js'] ?? 'govuk-frontend.min.js',
				mojJsFile: manifest['moj-frontend.min.js'] ?? 'moj-frontend.min.js',
				autocompleteStyleFile: manifest['accessible-autocomplete.min.css'] ?? 'accessible-autocomplete.min.css',
				autocompleteJsFile: manifest['accessible-autocomplete.min.js'] ?? 'accessible-autocomplete.min.js'
			}
		};
		// set a global variable for Nunjucks, used by the select-authority component
		res.locals.changeAuthorityEmail = changeAuthorityEmail;
		next();
	};
}
