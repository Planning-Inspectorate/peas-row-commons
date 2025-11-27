import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type { Handler, Request } from 'express';
import { questionHasAnswer } from '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js';
import { CASEWORK_AREAS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/casework-areas.ts';
import { CASE_TYPES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/types.ts';

export const JOURNEY_ID = 'create-a-case';

export function createJourney(documentTypeId: string, questions: any, response: Handler, req: Request) {
	if (!req.baseUrl.endsWith('/' + documentTypeId)) {
		throw new Error(`not a valid request for the ${documentTypeId} journey`);
	}

	return new Journey({
		journeyId: documentTypeId,
		sections: [

			 	new Section('', 'questions')
				.addQuestion(questions.caseworkArea)
				.addQuestion(questions.planningEnvironmentApplications)
				.withCondition((response: any) => questionHasAnswer(response,questions.caseworkArea,CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS))
				.addQuestion(questions.drought)
				.withCondition((response: any) => questionHasAnswer(response,questions.planningEnvironmentApplications,CASE_TYPES_ID.DROUGHT))
				.addQuestion(questions.rightsOfWayAndCommonLand)
				.withCondition((response: any) => questionHasAnswer(response,questions.caseworkArea, CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND)
				)
		
		],
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
