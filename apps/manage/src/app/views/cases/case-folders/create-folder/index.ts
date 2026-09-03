import type { ManageService } from '#service';
import { validateIdFormat } from '@pins/peas-row-commons-lib/middleware/validate-params.ts';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { buildValidateFolderCreate } from '../validation/validation.ts';
import { buildCreateFolders, buildViewCreateFolders } from './controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [viewCreateCaseFolders, createCaseFolders, validateFolder] = createMiddlewares(service);

	router
		.route('/')
		.get(validateIdFormat, asyncHandler(viewCreateCaseFolders)) // Gets the "create folder" view
		.post(validateIdFormat, validateFolder, asyncHandler(createCaseFolders)); // Posts to create the folder

	return router;
}

/**
 * Creates the middlewares needed for the get and post for creating folders
 */
function createMiddlewares(service: ManageService) {
	return [buildViewCreateFolders(), buildCreateFolders(service), buildValidateFolderCreate(service)];
}
