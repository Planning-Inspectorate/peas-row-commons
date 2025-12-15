import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { validateIdFormat } from '../view/controller.ts';
import { buildViewCaseFolders } from './controller.ts';
import type { ManageService } from '#service';
import { buildViewCaseFolder } from './case-folder/controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const viewCaseFolders = buildViewCaseFolders(service);
	const viewCaseFolder = buildViewCaseFolder(service);

	// Gets "all folders" page
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolders));

	// Gets "individual folder" page
	router.get('/:folderId/:folderName', validateIdFormat, asyncHandler(viewCaseFolder));

	return router;
}
