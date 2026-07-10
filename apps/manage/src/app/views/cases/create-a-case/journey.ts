import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type { Handler, Request } from 'express';
import { whenQuestionHasAnswer } from '@planning-inspectorate/dynamic-forms';
import { CASEWORK_AREAS_ID, CASE_TYPES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/index.ts';
import { ManageListSection } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import type { CreateCaseQuestions } from './questions.ts';

export const JOURNEY_ID = 'create-a-case';

export function createJourney(documentTypeId: string, questions: CreateCaseQuestions, response: Handler, req: Request) {
	if (!req.baseUrl.endsWith('/' + documentTypeId)) {
		throw new Error(`not a valid request for the ${documentTypeId} journey`);
	}

	const isPlanningEnvAppArea = whenQuestionHasAnswer(
		questions.caseworkArea,
		CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS
	);
	const isRightsOfWayCommonLandArea = whenQuestionHasAnswer(
		questions.caseworkArea,
		CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND
	);

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
				.withCondition(whenQuestionHasAnswer(questions.planningEnvironmentApplications, CASE_TYPES_ID.DROUGHT))

				.addQuestion(questions.housingAndPlanningCpos)
				.withCondition(
					whenQuestionHasAnswer(questions.planningEnvironmentApplications, CASE_TYPES_ID.HOUSING_PLANNING_CPOS)
				)

				.addQuestion(questions.otherSecretaryofStateCasework)
				.withCondition(
					whenQuestionHasAnswer(questions.planningEnvironmentApplications, CASE_TYPES_ID.OTHER_SOS_CASEWORK)
				)

				.addQuestion(questions.wayleaves)
				.withCondition(whenQuestionHasAnswer(questions.planningEnvironmentApplications, CASE_TYPES_ID.WAYLEAVES))

				.endMultiQuestionCondition(CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS)

				/**
				 * Rights of Way and Common Land Flow
				 */
				.startMultiQuestionCondition(CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND, isRightsOfWayCommonLandArea)

				.addQuestion(questions.rightsOfWayAndCommonLand)

				.addQuestion(questions.coastalAccess)
				.withCondition(whenQuestionHasAnswer(questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.COASTAL_ACCESS))

				.addQuestion(questions.commonLand)
				.withCondition(whenQuestionHasAnswer(questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.COMMON_LAND))

				.addQuestion(questions.rightsOfWay)
				.withCondition(whenQuestionHasAnswer(questions.rightsOfWayAndCommonLand, CASE_TYPES_ID.RIGHTS_OF_WAY))

				.endMultiQuestionCondition(CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND)

				/**
				 * Generic Questions that all case types have.
				 */
				.addQuestion(questions.caseName)
				.addQuestion(questions.externalReference)
				.addQuestion(questions.receivedDate)
				.addQuestion(
					questions.applicantDetails,
					new ManageListSection()
						.addQuestion(questions.applicantName)
						.addQuestion(questions.applicantAddress)
						.addQuestion(questions.applicantContactDetails)
				)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.location)
				.addQuestion(questions.authority)
				.addQuestion(questions.caseOfficer)
				.addQuestion(questions.hasLinkedCases)
				.addQuestion(questions.isLeadCase)
				.withCondition(whenQuestionHasAnswer(questions.hasLinkedCases, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.leadCaseReference)
				.withCondition(whenQuestionHasAnswer(questions.isLeadCase, BOOLEAN_OPTIONS.NO))
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
