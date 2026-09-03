import type { ManageService } from '#service';
import { validateIdFormat, validateNoteIdFormat } from '@pins/peas-row-commons-lib/middleware/validate-params.ts';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import {
	buildCreateCaseNote,
	buildDeleteCaseNote,
	buildPreloadCaseNoteData,
	buildUpdateCaseNote,
	buildViewCaseNotes,
	buildViewDeleteCaseNote,
	buildViewEditCaseNote
} from './controller.ts';
import { buildValidateCaseNotesMiddleware } from './validation-middleware.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const [
		createCaseNote,
		viewCaseNotes,
		validateCaseNotesMiddleware,
		preloadCaseNoteData,
		viewEditCaseNote,
		updateCaseNote,
		viewDeleteCaseNote,
		deleteCaseNote
	] = createMiddlewares(service);

	router
		.route('/')
		// Gets the full case notes page
		.get(validateIdFormat, viewCaseNotes)
		// Creates a single case note from case details page
		.post(validateIdFormat, validateCaseNotesMiddleware, createCaseNote);

	router
		.route('/:noteId/edit')
		// Gets the edit case note page
		// preloadCaseNoteData fetches case reference and note, populating res.locals
		.get(validateIdFormat, validateNoteIdFormat, asyncHandler(preloadCaseNoteData), viewEditCaseNote)
		// Updates a single case note
		// preloadCaseNoteData ensures res.locals.reference is available for validation error rendering
		.post(
			validateIdFormat,
			validateNoteIdFormat,
			asyncHandler(preloadCaseNoteData),
			validateCaseNotesMiddleware,
			updateCaseNote
		);

	router
		.route('/:noteId/delete')
		.get(validateIdFormat, validateNoteIdFormat, asyncHandler(preloadCaseNoteData), viewDeleteCaseNote)
		.post(validateIdFormat, validateNoteIdFormat, asyncHandler(preloadCaseNoteData), deleteCaseNote);

	return router;
}

/**
 * Returns the middleware needed for the endpoints.
 */
function createMiddlewares(service: ManageService) {
	return [
		buildCreateCaseNote(service),
		buildViewCaseNotes(service),
		buildValidateCaseNotesMiddleware(),
		buildPreloadCaseNoteData(service),
		buildViewEditCaseNote(),
		buildUpdateCaseNote(service),
		buildViewDeleteCaseNote(),
		buildDeleteCaseNote(service)
	];
}
