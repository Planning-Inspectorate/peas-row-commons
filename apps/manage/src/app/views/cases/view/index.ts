import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildSave, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { buildGetJourneyMiddleware, buildViewCaseDetails, validateIdFormat } from './controller.ts';
import { buildUpdateCase } from './update-case.ts';
import { buildCreateCaseNote } from './case-notes.ts';
import { ManageService } from '#service';
import { buildValidateCaseNotesMiddleware } from './validation-middleware.ts';

import { createRoutes as createCaseDocumentsRoutes } from '../case-folders/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const viewCaseDetails = buildViewCaseDetails();
	const updateCaseFn = buildUpdateCase(service);
	const updateCase = buildSave(updateCaseFn, true);
	const clearAndUpdateCaseFn = buildUpdateCase(service, true);
	const clearAndUpdateCase = buildSave(clearAndUpdateCaseFn, true);
	const createCaseNote = buildCreateCaseNote(service);
	const validateCaseNotesMiddleware = buildValidateCaseNotesMiddleware();

	const caseDocumentsRoutes = createCaseDocumentsRoutes(service);

	// View case documents page, /:id/case-documents
	router.use('/case-folders', caseDocumentsRoutes);

	// View case
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

	// Adds a case note
	router.post('/case-note', validateIdFormat, validateCaseNotesMiddleware, createCaseNote);

	return router;
}
