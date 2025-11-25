import { Router as createRouter } from 'express';
import type { Handler, Request, IRouter } from 'express';
// @ts-expect-error - due to not having @types
import { buildGetJourney } from '@planning-inspectorate/dynamic-forms/src/middleware/build-get-journey.js';
// @ts-expect-error - due to not having @types
import { list, question, buildSave } from '@planning-inspectorate/dynamic-forms/src/controller.js';
// @ts-expect-error - due to not having @types
import { redirectToUnansweredQuestion } from '@planning-inspectorate/dynamic-forms/src/middleware/redirect-to-unanswered-question.js';
// @ts-expect-error - due to not having @types
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
// @ts-expect-error - due to not having @types
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import {
	saveDataToSession,
	buildGetJourneyResponseFromSession
	// @ts-expect-error - due to not having @types
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID, createJourney } from './journey.ts';
import { getQuestions } from './questions.ts';
import { buildSaveController } from './save.ts';
import { ManageService } from '#service';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createCaseTypeRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req: Request, journeyResponse: Handler) =>
		createJourney(JOURNEY_ID, questions, journeyResponse, req)
	);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);
	// to do save controller
	buildSaveController(service);

	router.get('/', getJourneyResponse, getJourney, redirectToUnansweredQuestion());

	router.get('/:section/:question', getJourneyResponse, getJourney, question);

	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getJourney, (req, res) =>
		list(req, res, '', {
			pageHeading: 'Check your answers before uploading your document(s)',
			submitButtonText: 'Confirm upload'
		})
	);

	return router;
}
