import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { validateIdFormat } from '../view/controller.ts';
import { buildViewCaseFolders } from './controller.ts';
import type { ManageService } from '#service';
import { createRoutes as createSingleFolderRoutes } from './case-folder/index.ts';
import { createRoutes as createCreateFolderRoutes } from './create-folder/index.ts';
import { createRoutes as createSearchFilesRoutes } from './search-files/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [viewCaseFolders] = createMiddlewares(service);

	const [singleFolderRoutes, createFolderRoutes, searchFilesRoutes] = createRoutesToMount(service);

	// Gets "all folders" page
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolders));

	// Mounts "individual folder" routes
	router.use('/:folderId/:folderName', singleFolderRoutes);

	// Mounts the "folder creation" routes
	router.use('/create-folder', createFolderRoutes);

	// Mounts the "file search" routes
	router.use('/search-results', searchFilesRoutes);

	return router;
}

/**
 * Creates the middleware functions needed for the endpoints
 */
function createMiddlewares(service: ManageService) {
	return [buildViewCaseFolders(service)];
}

/**
 * Creates the routes that we are mounting on the main route,
 * folder creation and single folder view.
 */
function createRoutesToMount(service: ManageService) {
	return [createSingleFolderRoutes(service), createCreateFolderRoutes(service), createSearchFilesRoutes(service)];
}
