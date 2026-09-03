import type { ManageService } from '#service';
import { validateIdFormat } from '@pins/peas-row-commons-lib/middleware/validate-params.ts';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { buildViewCaseHistory } from './controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const viewCaseHistory = buildViewCaseHistory(service);

	router.get('/', validateIdFormat, asyncHandler(viewCaseHistory));

	return router;
}
