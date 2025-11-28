import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildGetJourneyMiddleware, buildViewCaseDetails, validateIdFormat } from './controller.ts';
import { ManageService } from '#service';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const viewCaseDetails = buildViewCaseDetails();

	router.get('/', validateIdFormat, getJourney, asyncHandler(viewCaseDetails));

	return router;
}
