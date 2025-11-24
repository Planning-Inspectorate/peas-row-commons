import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		res.locals.config = {
			styleFile: 'style-a700d7e6.css',
			headerTitle: 'Service name placeholder'
		};
		next();
	};
}
