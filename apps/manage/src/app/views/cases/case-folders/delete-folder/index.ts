import type { ManageService } from '#service';
import { validateIdFormat } from '@pins/peas-row-commons-lib/middleware/validate-params.ts';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { buildDeleteFolderController, buildDeleteFolderView } from './controller.ts';
import { buildValidateDeleteFolder } from './validation.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [viewDeleteFolder, deleteFolderController, validateFolder] = createMiddlewares(service);

	router
		.route('/')
		.get(validateIdFormat, asyncHandler(viewDeleteFolder)) // Gets the "delete folder" view
		.post(validateIdFormat, validateFolder, asyncHandler(deleteFolderController)); // Posts to delete the folder

	return router;
}

/**
 * Creates the middlewares needed for the get and post for deleting folders
 */
function createMiddlewares(service: ManageService) {
	return [buildDeleteFolderView(service), buildDeleteFolderController(service), buildValidateDeleteFolder(service)];
}
