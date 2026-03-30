import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildDownloadDocument } from './download/controller.ts';
import { buildToggleDocumentAction } from './status/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const [downloadDocument, toggleDocumentAction] = createMiddlewares(service);

	// Bulk deleting (e.g. clicking the big download button at top of page)
	router.post('/download', asyncHandler(downloadDocument));

	// Single file downloading (e.g. clicking on Download inline)
	router.get('/:documentId/download', asyncHandler(downloadDocument));

	// Read/Unread and Flag/Unflag toggles
	router.post('/toggle-action', asyncHandler(toggleDocumentAction));

	return router;
}

/**
 * Creates the middleware needed for this router
 */
function createMiddlewares(service: ManageService) {
	return [buildDownloadDocument(service), buildToggleDocumentAction(service)];
}
