import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { validateIdFormat } from '../../view/controller.ts';
import type { ManageService } from '#service';
import { buildViewCaseFolder } from './controller.ts';
import { createRoutes as createUploadRoutes } from '../../upload/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const viewCaseFolder = buildViewCaseFolder(service);
	const uploadRoutes = createUploadRoutes(service);

	// Gets the "individual folder page"
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolder));

	// Mounts upload endpoints
	router.use('/upload', uploadRoutes);

	return router;
}
