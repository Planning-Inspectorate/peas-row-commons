import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		res.locals.config = {
			styleFile: 'style-00a9e03e.css',
			headerTitle: 'App 2 Service'
		};
		next();
	};
}
