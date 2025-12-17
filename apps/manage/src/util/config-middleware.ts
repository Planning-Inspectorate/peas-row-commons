import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		res.locals.config = {
			styleFile: 'style-aa5bad9b.css',
			headerTitle: 'Service name placeholder'
		};
		next();
	};
}
