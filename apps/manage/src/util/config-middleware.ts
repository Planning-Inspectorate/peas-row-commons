import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		res.locals.config = {
			styleFile: 'style-d78391b4.css',
			headerTitle: 'MPESC',
			footerLinks: [
				{
					text: 'Report a problem',
					link: 'https://forms.cloud.microsoft/e/MnyPPC4e1V'
				}
			]
		};
		next();
	};
}
