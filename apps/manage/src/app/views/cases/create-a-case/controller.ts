import { ManageService } from '#service';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

export function buildGetJourneyMiddleware(service: ManageService): AsyncRequestHandler {
	const { logger, getEntraClient } = service;
	// In current development, the only "group" will be those
	// with general access to the app.
	const groupId = service.authConfig.groups.applicationAccess;

	return async (req, res, next) => {
		try {
			const groupMembers = await getEntraGroupMembers({
				logger,
				initClient: getEntraClient,
				session: req.session,
				groupId
			});

			// Not happy about this... Ideally I would append to res.locals
			// but res isn't passed as a callback param so we don't
			// have access to it in the route
			(req as any).groupMembers = groupMembers;

			if (next) next();
		} catch (error) {
			logger.error({ error }, 'Failed to fetch entra group members');
			if (next) next();
		}
	};
}
