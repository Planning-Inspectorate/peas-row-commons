import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { validateIdFormat } from '../../view/controller.ts';
import type { ManageService } from '#service';
import { buildViewCaseFolder } from './controller.ts';
import { createRoutes as createUploadRoutes } from '../../upload/index.ts';
import { buildDeleteFileController, buildDeleteFileView } from '../../../documents/delete/controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const viewCaseFolder = buildViewCaseFolder(service);
	const deleteFileView = buildDeleteFileView(service);
	const deleteFileController = buildDeleteFileController(service);
	const uploadRoutes = createUploadRoutes(service);

	// Gets the "individual folder page"
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolder));

	// Mounts upload endpoints
	router.use('/upload', uploadRoutes);

	// Gets "delete" view
	router.get('/:documentId/delete', asyncHandler(deleteFileView));

	// "Soft deletes" document
	router.post('/:documentId/delete', asyncHandler(deleteFileController));

	return router;
}
