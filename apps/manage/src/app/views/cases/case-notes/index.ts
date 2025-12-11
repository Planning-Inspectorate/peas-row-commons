import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildCreateCaseNote } from './controller.ts';
import { validateIdFormat } from '../view/controller.ts';
import { buildValidateCaseNotesMiddleware } from './validation-middleware.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const createCaseNote = buildCreateCaseNote(service);
	const validateCaseNotesMiddleware = buildValidateCaseNotesMiddleware();

	// Creates case note
	router.post('/', validateIdFormat, validateCaseNotesMiddleware, createCaseNote);

	return router;
}
