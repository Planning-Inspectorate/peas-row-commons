import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildCreateCaseNote, buildViewCaseNotes } from './controller.ts';
import { validateIdFormat } from '../view/controller.ts';
import { buildValidateCaseNotesMiddleware } from './validation-middleware.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const [createCaseNote, viewCaseNotes, validateCaseNotesMiddleware] = createMiddlewares(service);

	router
		.route('/')
		// Gets the full case notes page
		.get(validateIdFormat, viewCaseNotes)
		// Creates a single case note from case details page
		.post(validateIdFormat, validateCaseNotesMiddleware, createCaseNote);

	return router;
}

/**
 * Returns the middleware needed for the endpoints.
 */
function createMiddlewares(service: ManageService) {
	return [buildCreateCaseNote(service), buildViewCaseNotes(service), buildValidateCaseNotesMiddleware()];
}
