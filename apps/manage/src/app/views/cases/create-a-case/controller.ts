import type { ManageService } from '#service';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

export function buildGetJourneyMiddleware(service: ManageService): AsyncRequestHandler {
	const { logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, _, next) => {
		try {
			const groupMembers = await getEntraGroupMembers({
				logger,
				initClient: getEntraClient,
				session: req.session,
				groupIds
			});

			// Not happy about this... Ideally I would append to res.locals
			// but res isn't passed as a callback param so we don't
			// have access to it in the route
			(req as any).groupMembers = groupMembers;

			if (next) next();
		} catch (error) {
			logger.error({ error }, 'Failed to fetch entra group members');
		}

		try {
			// Fetches the list of existing cases (id + reference) so they can be
			// offered as options for the lead case reference question.
			req.otherCases = await db.case.findMany({
				select: { id: true, reference: true },
				orderBy: { reference: 'asc' }
			});
		} catch (error) {
			logger.error({ error }, 'Failed to fetch other cases');
			req.otherCases = [];
		}

		if (next) next();
	};
}
