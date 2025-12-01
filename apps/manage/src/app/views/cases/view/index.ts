import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildSave, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { buildGetJourneyMiddleware, buildViewCaseDetails, validateIdFormat } from './controller.ts';
import { buildUpdateCase } from './update-case.ts';
import { ManageService } from '#service';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const viewCaseDetails = buildViewCaseDetails();
	const updateCaseFn = buildUpdateCase(service);
	const updateCase = buildSave(updateCaseFn, true);
	const clearAndUpdateCaseFn = buildUpdateCase(service, true);
	const clearAndUpdateCase = buildSave(clearAndUpdateCaseFn, true);

	router.get('/', validateIdFormat, getJourney, asyncHandler(viewCaseDetails));

	// View individual question
	router.get('/:section/:question', validateIdFormat, getJourney, asyncHandler(question));

	// Edit question
	router.post(
		'/:section/:question',
		validateIdFormat,
		getJourney,
		validate,
		validationErrorHandler,
		asyncHandler(updateCase)
	);

	// Deletes answer
	router.post('/:section/:question/remove', validateIdFormat, getJourney, asyncHandler(clearAndUpdateCase));

	return router;
}
