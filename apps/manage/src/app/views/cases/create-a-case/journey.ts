import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type { Handler, Request } from 'express';
import { questionHasAnswer } from '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js';
import { CASEWORK_AREAS_ID, CASE_TYPES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/index.ts';
import { PROCEDURE_GROUP_IDS } from './view-model.ts';

export const JOURNEY_ID = 'create-a-case';

export function createJourney(documentTypeId: string, questions: any, response: Handler, req: Request) {
	if (!req.baseUrl.endsWith('/' + documentTypeId)) {
		throw new Error(`not a valid request for the ${documentTypeId} journey`);
	}

	const isSpecificArea = (response: JourneyResponse, areaToCheck: string) =>
		questionHasAnswer(response, questions.caseworkArea, areaToCheck);

	const isPlanningEnvAppArea = (response: JourneyResponse) =>
		isSpecificArea(response, CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS);
	const isRightsOfWayCommonLandArea = (response: JourneyResponse) =>
		isSpecificArea(response, CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND);

	return new Journey({
		journeyId: documentTypeId,
		sections: [
			new Section('', 'questions')
				.addQuestion(questions.caseworkArea)

				/**
				 * Planning, Environmental, & Applications Flow
				 */
				.startMultiQuestionCondition(CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS, isPlanningEnvAppArea)

				.addQuestion(questions.planningEnvironmentApplications)

				.addQuestion(questions.drought)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.DROUGHT)
				)

				.addQuestion(questions.housingAndPlanningCpos)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.HOUSING_PLANNING_CPOS)
				)

				.addQuestion(questions.otherSecretaryofStateCasework)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.OTHER_SOS_CASEWORK)
				)

				.addQuestion(questions.wayleaves)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.WAYLEAVES)
				)

				.endMultiQuestionCondition(CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS)

				/**
				 * Rights of Way and Common Land Flow
				 */
				.startMultiQuestionCondition(CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND, isRightsOfWayCommonLandArea)

				.addQuestion(questions.rightsOfWayAndCommonLand)

				.addQuestion(questions.coastalAccess)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.COASTAL_ACCESS)
				)

				.addQuestion(questions.commonLand)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.COMMON_LAND)
				)

				.addQuestion(questions.rightsOfWay)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.RIGHTS_OF_WAY)
				)

				.endMultiQuestionCondition(CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND)

				/**
				 * Generic Questions that all case types have.
				 */
				.addQuestion(questions.caseName)
				.addQuestion(questions.externalReference)
				.addQuestion(questions.receivedDate)
				.addQuestion(questions.applicant)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.area)
				.addQuestion(questions.authority)
				.addQuestion(questions.caseOfficer)
				.addQuestion(questions.procedure)

				/**
				 * Procedure specific questions if user selects admin or site visit
				 * (stored flatly in DB).
				 */
				.addQuestion(questions.adminProcedure)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.procedure, PROCEDURE_GROUP_IDS.ADMIN)
				)

				.addQuestion(questions.siteVisitProcedure)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.procedure, PROCEDURE_GROUP_IDS.SITE_VISIT)
				)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: `Create a Case`,
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: '/cases',
		response
	});
}
