import type { App2Service } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

export function buildListItems(service: App2Service): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list items');

		// check the DB connection is working
		await db.$queryRaw`SELECT 1`;

		return res.render('views/items/list/view.njk', {
			pageHeading: 'Some Service Name',
			items: [
				{ task: 'Create new service', done: true },
				{ task: 'Implement a new feature', done: false },
				{ task: 'Fix a bug', done: false }
			]
		});
	};
}
