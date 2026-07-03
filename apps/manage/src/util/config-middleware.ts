import type { Handler } from 'express';
import type { Manifest } from '@pins/peas-row-commons-lib/util/manifest.ts';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(manifest: Manifest): Handler {
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
		next();
	};
}
