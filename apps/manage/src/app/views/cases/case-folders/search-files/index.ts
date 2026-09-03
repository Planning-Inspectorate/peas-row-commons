import type { ManageService } from '#service';
import { validateIdFormat } from '@pins/peas-row-commons-lib/middleware/validate-params.ts';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { buildFileSearchView } from './controller.ts';

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
