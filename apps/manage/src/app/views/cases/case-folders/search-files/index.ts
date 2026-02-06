import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildFileSearchView } from './controller.ts';
import { validateIdFormat } from '../../view/controller.ts';
import type { ManageService } from '#service';
import { buildDeleteFileController, buildDeleteFileView } from '../../../documents/delete/controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [viewFileSearch, deleteFileView, deleteFileController] = createMiddlewares(service);

	// Gets the view for the "file searching" page
	router.get('/', validateIdFormat, asyncHandler(viewFileSearch));

	// Gets "delete" view
	router.get('/:documentId/delete', asyncHandler(deleteFileView));

	// "Soft deletes" document
	router.post('/:documentId/delete', asyncHandler(deleteFileController));

	return router;
}

/**
 * Creates the middleware functions needed for the endpoints
 */
function createMiddlewares(service: ManageService) {
	return [buildFileSearchView(service), buildDeleteFileView(service), buildDeleteFileController(service)];
}
