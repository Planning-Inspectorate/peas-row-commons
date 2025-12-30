import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		res.locals.config = {
			styleFile: 'style-f0a89ff5.css',
			headerTitle: 'Service name placeholder'
		};
		next();
	};
}
