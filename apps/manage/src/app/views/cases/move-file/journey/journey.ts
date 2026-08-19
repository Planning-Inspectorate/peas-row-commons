import { Section, Journey, type JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

export const JOURNEY_ID = 'move';

export function createJourney(journeyType: string, questions: any, response: JourneyResponse, req: Request) {
	if (!req.baseUrl.endsWith('/' + journeyType)) {
		throw new Error(`not a valid request for the ${journeyType} journey`);
	}

	const initialBackLinkUrl = req.baseUrl.replace(/\/move\/?$/, '');

	return new Journey({
		journeyId: journeyType,
		sections: [new Section('', 'folder').addQuestion(questions.moveFolder)],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/folders-check-your-answers.njk',
		journeyTitle: 'Move Files',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: initialBackLinkUrl,
		response
	});
}
