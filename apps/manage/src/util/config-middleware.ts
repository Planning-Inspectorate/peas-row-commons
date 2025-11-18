import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		res.locals.config = {
			styleFile: 'style-8a473895.css',
			headerTitle: 'Service name placeholder'
		};
		next();
	};
}
