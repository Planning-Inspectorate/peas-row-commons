import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(): Handler {
	return (req, res, next) => {
		res.locals.config = {
			styleFile: 'style-b2664d7d.css',
			headerTitle: 'Manage planning, environmental and specialist casework'
		};
		next();
	};
}
