import { Router as createRouter } from 'express';
import type { Handler, Request, IRouter } from 'express';
import { buildGetJourney } from '@planning-inspectorate/dynamic-forms/src/middleware/build-get-journey.js';
import { list, question, buildSave } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import { redirectToUnansweredQuestion } from '@planning-inspectorate/dynamic-forms/src/middleware/redirect-to-unanswered-question.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import {
	saveDataToSession,
	buildGetJourneyResponseFromSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID, createJourney } from './journey.ts';
import { getQuestions } from './questions.ts';
import { buildSaveController, buildSuccessController } from './save.ts';
import { ManageService } from '#service';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildGetJourneyMiddleware } from './controller.ts';

export function createNewCaseRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const getJourneyMiddleware = buildGetJourneyMiddleware(service);

	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);

	const getJourney = buildGetJourney(
		(req: Request & { groupMembers: { caseOfficers: never[] } }, journeyResponse: Handler) => {
			const groupMembers = req.groupMembers; // Stored on request object because we do not have access to the response object.
			const questions = getQuestions(groupMembers);

			return createJourney(JOURNEY_ID, questions, journeyResponse, req);
		}
	);

	const saveController = buildSaveController(service);
	const successController = buildSuccessController();

	router.get('/', getJourneyResponse, getJourneyMiddleware, getJourney, redirectToUnansweredQuestion());

	router.get('/:section/:question', getJourneyResponse, getJourneyMiddleware, getJourney, question);

	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourneyMiddleware,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getJourneyMiddleware, getJourney, (req, res) =>
		list(req, res, '', {
			pageHeading: 'Check your answers',
			submitButtonText: 'Save and continue'
		})
	);

	router.post(
		'/check-your-answers',
		getJourneyResponse,
		getJourneyMiddleware,
		getJourney,
		asyncHandler(saveController)
	);

	router.get('/success', asyncHandler(successController));

	return router;
}
