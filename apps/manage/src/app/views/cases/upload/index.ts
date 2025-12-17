import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { validateIdFormat } from '../view/controller.ts';
import type { ManageService } from '#service';
import { buildUploadToFolderView } from './controller.ts';
import multer from 'multer';
import { uploadDocumentsController } from './upload-documents.ts';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, TOTAL_UPLOAD_LIMIT } from './constants.ts';
import { validateUploads } from './validation-middleware.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const uploadToFoldersView = buildUploadToFolderView(service);

	const validateRequest = asyncHandler(
		validateUploads(service, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, TOTAL_UPLOAD_LIMIT)
	);

	const uploadDocuments = asyncHandler(uploadDocumentsController(service));

	const handleUploads = multer();

	// Gets "upload" page
	router.get('/', validateIdFormat, asyncHandler(uploadToFoldersView));

	// Uploads files
	router.post('/', handleUploads.array('documents'), validateRequest, uploadDocuments);

	return router;
}
