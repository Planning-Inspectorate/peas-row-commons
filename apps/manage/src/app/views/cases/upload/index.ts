import type { ManageService } from '#service';
import { validateIdFormat } from '@pins/peas-row-commons-lib/middleware/validate-params.ts';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import multer from 'multer';
import { createDocumentsController } from './commit-documents/controller.ts';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, TOTAL_UPLOAD_LIMIT } from './constants.ts';
import { buildUploadToFolderView } from './controller.ts';
import { deleteDocumentController } from './delete-document/controller.ts';
import { uploadDocumentsController } from './upload-documents/controller.ts';
import { validateUploads } from './upload-documents/validation-middleware.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const uploadToFoldersView = buildUploadToFolderView(service);

	const validateRequest = asyncHandler(
		validateUploads(service, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, TOTAL_UPLOAD_LIMIT)
	);

	const uploadDocuments = asyncHandler(uploadDocumentsController(service));

	const createDocuments = asyncHandler(createDocumentsController(service));

	const deleteDocument = asyncHandler(deleteDocumentController(service));

	const handleUploads = multer();

	// Gets "upload" page
	router.get('/', validateIdFormat, asyncHandler(uploadToFoldersView));

	// Uploads files (i.e. saves data to Blob)
	router.post('/document', handleUploads.array('documents'), validateRequest, uploadDocuments);

	// Deletes DraftDocument & its Azure blob path
	router.post('/delete', deleteDocument);

	// Commits to DB (i.e. creates documents rows)
	router.post('/', createDocuments);

	return router;
}
