import type { Manifest } from '@pins/peas-row-commons-lib/util/manifest.ts';
import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(manifest: Manifest, changeAuthorityEmail?: string): Handler {
	const styleFile = manifest['style.css'] ?? 'style.css';
	return (req, res, next) => {
		res.locals.config = {
			styleFile,
			headerTitle: 'MPESC',
			footerLinks: [
				{
					text: 'Report a problem',
					link: 'https://mhclg.service-now.com/sp/?id=landing'
				}
			]
		};
		// set a global variable for Nunjucks, used by the select-authority component
		res.locals.changeAuthorityEmail = changeAuthorityEmail;
		next();
	};
}
