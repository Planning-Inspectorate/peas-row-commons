import type { ManageService } from '#service';
import { validateIdFormat } from '@pins/peas-row-commons-lib/middleware/validate-params.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { Router as createRouter } from 'express';
import { buildValidateFileRename } from '../validation/file-validation.ts';
import { buildRenameFile, buildRenameFileView } from './controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [viewRenameFile, renameFile, validateFileName] = createMiddlewares(service);

	router
		.route('/')
		.get(validateIdFormat, asyncHandler(viewRenameFile)) // Gets the "rename file" view
		.post(validateIdFormat, validateFileName, asyncHandler(renameFile)); // Posts to rename the file

	return router;
}

/**
 * Creates the middlewares needed for the get and post for renaming a file.
 */
function createMiddlewares(service: ManageService) {
	return [buildRenameFileView(service), buildRenameFile(service), buildValidateFileRename(service)];
}
