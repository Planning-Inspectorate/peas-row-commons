import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type { Handler, Request } from 'express';

export const JOURNEY_ID = 'create-a-case';

export function createJourney(documentTypeId: string, questions: any, response: Handler, req: Request) {
	if (!req.baseUrl.endsWith('/' + documentTypeId)) {
		throw new Error(`not a valid request for the ${documentTypeId} journey`);
	}

	return new Journey({
		journeyId: documentTypeId,
		sections: [new Section('', 'questions').addQuestion(questions.caseworkArea)],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: `Create a Case`,
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: req.baseUrl,
		response
	});
}
