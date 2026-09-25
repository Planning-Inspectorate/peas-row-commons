import type { ManageService } from '#service';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import type { CreateCaseRequest } from './types.ts';

export function buildGetJourneyMiddleware(service: ManageService): AsyncRequestHandler {
	const { logger, getEntraClient, db } = service;
	const groupIds = service.entraGroupIds;

	return async (req: CreateCaseRequest, _, next) => {
		try {
			// Not happy about this... Ideally I would append to res.locals
			// but res isn't passed as a callback param so we don't
			// have access to it in the route
			req.groupMembers = await getEntraGroupMembers({
				logger,
				initClient: getEntraClient,
				session: req.session,
				groupIds
			});
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
