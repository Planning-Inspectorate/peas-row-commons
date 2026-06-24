import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		res.locals.config = {
			styleFile: 'style-025b2cad.css',
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
