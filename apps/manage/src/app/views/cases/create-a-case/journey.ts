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
				.withCondition((response: any) => questionHasAnswer(response, questions.caseworkArea, CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS))

				.addQuestion(questions.drought)
				.withCondition((response: any) => questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.DROUGHT))
	
				
				.addQuestion(questions.housingAndPlanningCpos)
				.withCondition((response: any) => questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.HOUSING_PLANNING_CPOS))
			

				.addQuestion(questions.otherSecretaryofStatecasework)
				.withCondition((response: any) => questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.OTHER_SOS_CASEWORK))
//To do bit amguity with purchase notice cant se the the screen in ui
				.addQuestion(questions.purchaseNotices)
				.withCondition((response: any) => questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.PURCHASE_NOTICES))

				.addQuestion(questions.wayleaves)
				.withCondition((response: any) => questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.WAYLEAVES))


				.addQuestion(questions.rightsOfWayAndCommonLand)
				.withCondition((response: any) => questionHasAnswer(response, questions.caseworkArea, CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND)
				)

				.addQuestion(questions.coastalAccess)
				.withCondition((response: any) => questionHasAnswer(response, questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.COASTAL_ACCESS))

				.addQuestion(questions.commonLand)
				.withCondition((response: any) => questionHasAnswer(response, questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.COMMON_LAND))

				.addQuestion(questions.rightsOfWay)
				.withCondition((response: any) => questionHasAnswer(response, questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.RIGHTS_OF_WAY))
	
		        .addQuestion(questions.caseName)
				.addQuestion(questions.externalReference)
				.addQuestion(questions.caseReceived)
				.addQuestion(questions.applicant)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.area)
				.addQuestion(questions.authority)
				.addQuestion(questions.caseOfficer)
					.addQuestion(questions.procedure)

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
