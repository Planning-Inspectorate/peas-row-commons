import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type { Handler, Request } from 'express';
import { questionHasAnswer } from '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js';
import { CASEWORK_AREAS_ID, CASE_TYPES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/index.ts';

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
				.addQuestion(questions.planningEnvironmentApplications)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.caseworkArea, CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS)
				)

				.addQuestion(questions.drought)
				.withCondition(
					(response: JourneyResponse) =>
						questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.DROUGHT) &&
						// NB. Explicitly validate the parent area to prevent stale session data from leaking if a user switches flows (e.g. RoW to PEAS).
						isPlanningEnvAppArea(response)
				)

				.addQuestion(questions.housingAndPlanningCpos)
				.withCondition(
					(response: JourneyResponse) =>
						questionHasAnswer(
							response,
							questions.planningEnvironmentApplications,
							CASE_TYPES_ID.HOUSING_PLANNING_CPOS
						) && isPlanningEnvAppArea(response)
				)

				.addQuestion(questions.otherSecretaryofStateCasework)
				.withCondition(
					(response: JourneyResponse) =>
						questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.OTHER_SOS_CASEWORK) &&
						isPlanningEnvAppArea(response)
				)

				.addQuestion(questions.wayleaves)
				.withCondition(
					(response: JourneyResponse) =>
						questionHasAnswer(response, questions.planningEnvironmentApplications, CASE_TYPES_ID.WAYLEAVES) &&
						isPlanningEnvAppArea(response)
				)

				/**
				 * Rights of Way and Common Land Flow
				 */
				.addQuestion(questions.rightsOfWayAndCommonLand)
				.withCondition((response: JourneyResponse) =>
					questionHasAnswer(response, questions.caseworkArea, CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND)
				)

				.addQuestion(questions.coastalAccess)
				.withCondition(
					(response: JourneyResponse) =>
						questionHasAnswer(response, questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.COASTAL_ACCESS) &&
						isRightsOfWayCommonLandArea(response)
				)

				.addQuestion(questions.commonLand)
				.withCondition(
					(response: JourneyResponse) =>
						questionHasAnswer(response, questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.COMMON_LAND) &&
						isRightsOfWayCommonLandArea(response)
				)

				.addQuestion(questions.rightsOfWay)
				.withCondition(
					(response: JourneyResponse) =>
						questionHasAnswer(response, questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.RIGHTS_OF_WAY) &&
						isRightsOfWayCommonLandArea(response)
				)

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
