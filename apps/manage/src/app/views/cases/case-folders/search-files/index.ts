import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildFileSearchView } from './controller.ts';
import { validateIdFormat } from '../../view/controller.ts';
import type { ManageService } from '#service';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [viewFileSearch] = createMiddlewares(service);

	// Gets the view for the "file searching" page
	router.get('/', validateIdFormat, asyncHandler(viewFileSearch));

	return router;
}

/**
 * Creates the middleware functions needed for the endpoints
 */
function createMiddlewares(service: ManageService) {
	return [buildFileSearchView(service)];
}
