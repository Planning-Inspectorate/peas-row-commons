import type { App1Service } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

/**
 * Example home page controller
 */
export function buildHomePage(service: App1Service): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		let connected = false;
		try {
			// Check if the database is connected
			await db.$queryRaw`SELECT 1`;
			connected = true;
		} catch (error) {
			logger.error({ error }, 'Database connection failed');
		}

		req.session.visits = (req.session.visits || 0) + 1;

		const viewModel = {
			connected,
			visitCount: req.session.visits
		};

		logger.info({ viewModel }, 'home page');
		return res.render('views/home/view.njk', {
			pageTitle: 'This is the home page',
			...viewModel
		});
	};
}
