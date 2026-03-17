import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildDownloadDocument } from './download/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const downloadDocument = buildDownloadDocument(service);

	// Bulk deleting (e.g. clicking the big download button at top of page)
	router.post('/download', asyncHandler(downloadDocument));

	// Single file downloading (e.g. clicking on Download inline)
	router.get('/:documentId/download', asyncHandler(downloadDocument));

	return router;
}
