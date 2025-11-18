import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

export function buildListCases(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list cases');

		const [cases] = await Promise.all([
			db.case.findMany({
				orderBy: { createdDate: 'desc' },
				take: 1000
			})
		]);

		return res.render('views/cases/list/view.njk', {
			pageHeading: 'All Cases',
			cases
		});
	};
}
