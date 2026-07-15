import { Router as createRouter, type Request, type Response } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { validateIdFormat } from '../../view/controller.ts';
import type { ManageService } from '#service';
import { buildViewCaseFolder } from './controller.ts';
import { createRoutes as createUploadRoutes } from '../../upload/index.ts';
import {
	buildDeleteFileController,
	buildDeleteFileView,
	buildRemoveFileFromSelection
} from '../../../documents/delete/controller.ts';
import { createRoutes as createCreateFolderRoutes } from '../create-folder/index.ts';
import { createRoutes as createDeleteFolderRoutes } from '../delete-folder/index.ts';
import { createRoutes as createRenameFolderRoutes } from '../rename-folder/index.ts';
import { createRoutes as createMoveFileRoutes } from '../../move-file/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [uploadRoutes, createFolderRoutes, deleteFolderRoutes, renameFolderRoutes, moveFileRoutes] =
		createRoutesToMount(service);

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

	// Mounts "move files" routes
	router.use('/move-files', moveFileRoutes);

	// Gets "delete" view (POST request but renders a view)
	router.post(
		'/documents/delete-confirmation',
		asyncHandler(async (req: Request, res: Response) => {
			// If user clicks remove on a specific file
			if (req.body.removeFile) {
				return buildRemoveFileFromSelection(service)(req, res);
			}
			// Otherwise proceed
			return deleteFileView(req, res);
		})
	);

	// "Soft deletes" document
	router.post('/documents/delete', asyncHandler(deleteFileController));

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
		createRenameFolderRoutes(service),
		createMoveFileRoutes(service)
	];
}
