import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { validateIdFormat } from '@pins/peas-row-commons-lib/middleware/validate-params.ts';
import { buildViewCaseHistory } from './controller.ts';
import type { ManageService } from '#service';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const viewCaseHistory = buildViewCaseHistory(service);

	router.get('/', validateIdFormat, asyncHandler(viewCaseHistory));

	return router;
}
