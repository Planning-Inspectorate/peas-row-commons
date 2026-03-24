import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { ManageService } from '#service';
import { buildDownloadCase } from './download-controller.ts';
import { buildDownloadContacts } from '../contacts-download/index.ts';

export function createDownloadRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	// Full case download (zip with PDFs + documents)
	router.get('/', asyncHandler(buildDownloadCase(service)));

	// Contacts CSV download
	router.get('/contacts', asyncHandler(buildDownloadContacts(service)));

	return router;
}
