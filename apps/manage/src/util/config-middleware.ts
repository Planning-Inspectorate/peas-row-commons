import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		res.locals.config = {
			styleFile: 'style-2c953252.css',
			headerTitle: 'App 2 Service'
		};
		next();
	};
}
