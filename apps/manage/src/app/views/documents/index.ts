import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildDownloadDocument } from './download/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const downloadDocument = buildDownloadDocument(service);

	// Downloads the document
	router.use('/:documentId/download', asyncHandler(downloadDocument));

	return router;
}
