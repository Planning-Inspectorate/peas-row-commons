import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

export function buildListCases(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list cases');

		const cases = await db.case.findMany({
			orderBy: { receivedDate: 'desc' },
			take: 1000,
			include: {
				Type: {
					select: {
						displayName: true
					}
				}
			}
		});

		return res.render('views/cases/list/view.njk', {
			pageHeading: 'Case list',
			cases
		});
	};
}
