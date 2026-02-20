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
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { JOURNEY_ID, createJourney } from './journey.ts';
import { getQuestions } from './questions.ts';
import { ManageService } from '#service';
import { buildLoadCaseData, buildSaveController } from './controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const [getJourney, getJourneyResponse, saveController, loadCaseData, getListView] = createMiddlewares(service);

	// Base route for the journey
	router.get('/', getJourneyResponse, asyncHandler(loadCaseData), getJourney, redirectToUnansweredQuestion());

	// An individual questions "view"
	router.get('/:section/:question', getJourneyResponse, asyncHandler(loadCaseData), getJourney, question);

	// Saving an individual question just to session
	router.post(
		'/:section/:question',
		getJourneyResponse,
		asyncHandler(loadCaseData),
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	// The final page to make sure your answers look good
	router.get('/check-your-answers', getJourneyResponse, asyncHandler(loadCaseData), getJourney, getListView);

	// Saves the new folder to the documents.
	router.post(
		'/check-your-answers',
		getJourneyResponse,
		asyncHandler(loadCaseData),
		getJourney,
		asyncHandler(saveController)
	);

	return router;
}

/**
 * Calls the factory functions to generate the needed middlewares for this router.
 */
function createMiddlewares(service: ManageService) {
	return [
		buildGetJourney((req: Request & { folderStructure: Record<string, any> }, journeyResponse: Handler) => {
			const folderStructure = req.folderStructure;
			const questions = getQuestions(folderStructure);
			return createJourney(JOURNEY_ID, questions, journeyResponse, req);
		}),
		buildGetJourneyResponseFromSession(JOURNEY_ID),
		buildSaveController(service),
		buildLoadCaseData(service),
		(req: Request, res: Response) =>
			list(req, res, '', {
				backLinkUrl: `${req.baseUrl}/folder/file-location`,
				pageHeading: 'Check details and update file location',
				cancelUrl: req.baseUrl.split('/move-files')[0] // we want to go all the way back to the folder page
			})
	];
}
