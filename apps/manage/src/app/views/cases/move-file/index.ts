import { Router as createRouter } from 'express';
import type { IRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { ManageService } from '#service';
import { buildHandleMoveSelection, buildViewMoveFiles } from './controller.ts';

import { createRoutes as createMoveJourneyRoutes } from './journey/index.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const [handleMoveSelection, viewMoveFiles] = createMiddlewares(service);

	const [moveJourneyRoutes] = createRoutesToMount(service);

	// Implements the Post-Redirect-Get (PRG) pattern: the POST saves the file selection
	// to the session, then redirects to the GET to render the UI.
	router.route('/').get(asyncHandler(viewMoveFiles)).post(asyncHandler(handleMoveSelection));

	// Mounts the move folder journey routes.
	router.use('/move', moveJourneyRoutes);

	return router;
}

/**
 * Returns the middleware needed for the endpoints.
 */
function createMiddlewares(service: ManageService) {
	return [buildHandleMoveSelection(), buildViewMoveFiles(service)];
}

/**
 * Creates the upload and folder routes to be mounted on main router
 */
function createRoutesToMount(service: ManageService) {
	return [createMoveJourneyRoutes(service)];
}
