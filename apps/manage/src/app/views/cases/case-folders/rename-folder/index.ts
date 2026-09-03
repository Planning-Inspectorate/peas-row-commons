import type { ManageService } from '#service';
import { validateIdFormat } from '@pins/peas-row-commons-lib/middleware/validate-params.ts';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { buildValidateFolderRename } from '../validation/validation.ts';
import { buildRenameFolder, buildRenameFolderView } from './controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [viewCreateCaseFolders, createCaseFolders, validateFolder] = createMiddlewares(service);

	router
		.route('/')
		.get(validateIdFormat, asyncHandler(viewCreateCaseFolders)) // Gets the "rename folder" view
		.post(validateIdFormat, validateFolder, asyncHandler(createCaseFolders)); // Posts to rename the folder

	return router;
}

/**
 * Creates the middlewares needed for the get and post for creating folders
 */
function createMiddlewares(service: ManageService) {
	return [buildRenameFolderView(service), buildRenameFolder(service), buildValidateFolderRename(service)];
}
