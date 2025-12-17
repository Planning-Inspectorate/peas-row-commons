import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { validateIdFormat } from '../view/controller.ts';
import { buildViewCaseFolders } from './controller.ts';
import type { ManageService } from '#service';
import { createRoutes as createSingleFolderRoutes } from './case-folder/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const viewCaseFolders = buildViewCaseFolders(service);
	const singleFolderRoutes = createSingleFolderRoutes(service);

	// Gets "all folders" page
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolders));

	// Mounts "individual folder" routes
	router.use('/:folderId/:folderName', singleFolderRoutes);

	return router;
}
