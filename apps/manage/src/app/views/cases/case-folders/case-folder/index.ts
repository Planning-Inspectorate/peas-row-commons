import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { validateIdFormat } from '../../view/controller.ts';
import type { ManageService } from '#service';
import { buildViewCaseFolder } from './controller.ts';
import { createRoutes as createUploadRoutes } from '../../upload/index.ts';
import { buildDeleteFileController, buildDeleteFileView } from '../../../documents/delete/controller.ts';
import { createRoutes as createCreateFolderRoutes } from '../create-folder/index.ts';
import { createRoutes as createDeleteFolderRoutes } from '../delete-folder/index.ts';
import { createRoutes as createRenameFolderRoutes } from '../rename-folder/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [uploadRoutes, createFolderRoutes, deleteFolderRoutes, renameFolderRoutes] = createRoutesToMount(service);

	const [viewCaseFolder, deleteFileView, deleteFileController] = createMiddlewares(service);

	// Gets the "individual folder page"
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolder));

	// Mounts upload endpoints
	router.use('/upload', uploadRoutes);

	// Mounts "create folder" routes
	router.use('/create-folder', createFolderRoutes);

	// Mounts "rename folder" routes
	router.use('/rename-folder', renameFolderRoutes);

	// Mounts "delete folder" routes
	router.use('/delete-folder', deleteFolderRoutes);

	// Gets "delete" view
	router.get('/:documentId/delete', asyncHandler(deleteFileView));

	// "Soft deletes" document
	router.post('/:documentId/delete', asyncHandler(deleteFileController));

	return router;
}

/**
 * Returns the middleware needed for the endpoints,
 * deleting and viewing folders
 */
function createMiddlewares(service: ManageService) {
	return [buildViewCaseFolder(service), buildDeleteFileView(service), buildDeleteFileController(service)];
}

/**
 * Creates the upload and folder routes to be mounted on main router
 */
function createRoutesToMount(service: ManageService) {
	return [
		createUploadRoutes(service),
		createCreateFolderRoutes(service),
		createDeleteFolderRoutes(service),
		createRenameFolderRoutes(service)
	];
}
