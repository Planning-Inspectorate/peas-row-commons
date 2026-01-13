import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildSave, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { buildGetJourneyMiddleware, buildViewCaseDetails, validateIdFormat } from './controller.ts';
import { buildUpdateCase } from './update-case.ts';
import { ManageService } from '#service';
import { createRoutes as createCaseNotesRoutes } from '../case-notes/index.ts';

import { createRoutes as createCaseDocumentsRoutes } from '../case-folders/index.ts';
import {
	buildGetJourneyResponseFromSession,
	saveDataToSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const viewCaseDetails = buildViewCaseDetails();
	const updateCaseFn = buildUpdateCase(service);
	const updateCase = buildSave(updateCaseFn, true);
	const clearAndUpdateCaseFn = buildUpdateCase(service, true);
	const clearAndUpdateCase = buildSave(clearAndUpdateCaseFn, true);

	const caseNoteRoutes = createCaseNotesRoutes(service);

	const caseDocumentsRoutes = createCaseDocumentsRoutes(service);

	// View case documents page, /:id/case-documents
	router.use('/case-folders', caseDocumentsRoutes);

	// View case
	router.get('/', validateIdFormat, getJourney, asyncHandler(viewCaseDetails));

	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);

	// View individual question
	router.get(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		validateIdFormat,
		getJourneyResponse,
		getJourney,
		asyncHandler(question)
	);

	// Edit question
	router.post(
		'/:section/:question',
		validateIdFormat,
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		asyncHandler(updateCase)
	);

	// Edit a ManageList section question (save it to session)
	router.post(
		'/:section/:question/:manageListAction/:manageListItemId/:manageListQuestion',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	// Deletes answer
	router.post('/:section/:question/remove', validateIdFormat, getJourney, asyncHandler(clearAndUpdateCase));

	// Load case note routes
	router.use('/case-note', caseNoteRoutes);

	return router;
}
