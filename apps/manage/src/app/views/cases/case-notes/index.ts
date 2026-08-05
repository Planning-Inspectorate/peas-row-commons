import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import {
	buildCreateCaseNote,
	buildViewCaseNotes,
	buildViewEditCaseNote,
	buildUpdateCaseNote,
	buildPreloadCaseNoteData
} from './controller.ts';
import { validateIdFormat } from '../view/controller.ts';
import { buildValidateCaseNotesMiddleware } from './validation-middleware.ts';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const [
		createCaseNote,
		viewCaseNotes,
		validateCaseNotesMiddleware,
		preloadCaseNoteData,
		viewEditCaseNote,
		updateCaseNote
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
		.get(validateIdFormat, asyncHandler(preloadCaseNoteData), viewEditCaseNote)
		// Updates a single case note
		// preloadCaseNoteData ensures res.locals.reference is available for validation error rendering
		.post(validateIdFormat, asyncHandler(preloadCaseNoteData), validateCaseNotesMiddleware, updateCaseNote);

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
		buildUpdateCaseNote(service)
	];
}
