import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { ManageListSection } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js';
import type { Request } from 'express';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import { buildOutcomeManageList, buildDynamicOutcomeSections } from './journeys/outcome-journey.ts';
import {
	buildProcedureManageList,
	buildProcedureAllQuestionsSection,
	buildDynamicProcedureSections
} from './journeys/procedure-journey.ts';

export const JOURNEY_ID = 'case-details';

export function createJourney(questions: Record<string, any>, response: JourneyResponse, req: Request) {
	if (!req.params.id) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (no id param)`);
	}
	if (!req.baseUrl?.includes(req.params.id)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)`);
	}

	const outcomeManageList = buildOutcomeManageList(questions);
	const dynamicOutcomeSections = buildDynamicOutcomeSections(outcomeManageList, response);

	const procedureManageList = buildProcedureManageList(questions);
	const procedureAllQuestionsSection = buildProcedureAllQuestionsSection(questions);
	const dynamicProcedureSections = buildDynamicProcedureSections(procedureAllQuestionsSection, response);

	/**
	 * Checks that a manage list has at least 1 answer (of anything)
	 */
	const manageListHasAnswer = (response: JourneyResponse, question: Question) => {
		const answers = response.answers[question.fieldName];
		return Array.isArray(answers) && !!answers.length;
	};

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Overview', 'overview')
				.addQuestion(questions.caseType)
				.addQuestion(questions.caseSubtype)
				.addQuestion(questions.act)
				.addQuestion(questions.consentSought)
				.addQuestion(questions.priority)
				.addQuestion(questions.inspectorBand)
				.addQuestion(questions.relatedCaseDetails, new ManageListSection().addQuestion(questions.addRelatedCase))
				.addQuestion(
					questions.linkedCaseDetails,
					new ManageListSection().addQuestion(questions.linkedCaseReference).addQuestion(questions.isLead)
				),
			new Section('Case details', 'case-details')
				.addQuestion(questions.reference)
				.addQuestion(questions.externalReference)
				.addQuestion(questions.historicalReference)
				.addQuestion(questions.caseName)
				.addQuestion(questions.caseStatus)
				.addQuestion(questions.advertisedModificationStatus)
				.addQuestion(
					questions.applicantDetails,
					new ManageListSection()
						.addQuestion(questions.applicantName)
						.addQuestion(questions.applicantAddress)
						.addQuestion(questions.applicantContactDetails)
				)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.location)
				.addQuestion(questions.authority),
			new Section('Team', 'team')
				.addQuestion(questions.caseOfficer)
				.addQuestion(
					questions.inspectorDetails,
					new ManageListSection().addQuestion(questions.inspector).addQuestion(questions.inspectorAllocatedDate)
				),
			new Section('Timetable', 'timetable')
				.addQuestion(questions.expectedSubmissionDate)
				.addQuestion(questions.receivedDate)
				.addQuestion(questions.targetDecisionDate)
				.addQuestion(questions.startDate)
				.addQuestion(questions.objectionPeriodEndsDate)
				.addQuestion(questions.partiesDecisionNotificationDeadlineDate)
				.addQuestion(questions.expiryDate)
				.addQuestion(questions.proposedModificationsDate),
			new Section('Key contacts', 'key-contacts')
				.addQuestion(
					questions.objectorDetails,
					new ManageListSection()
						.addQuestion(questions.objectorName)
						.addQuestion(questions.objectorAddress)
						.addQuestion(questions.objectorContactDetails)
						.addQuestion(questions.objectorStatus)
				)
				.addQuestion(
					questions.contactDetails,
					new ManageListSection()
						.addQuestion(questions.contactType)
						.addQuestion(questions.contactName)
						.addQuestion(questions.contactAddress)
						.addQuestion(questions.contactContactDetails)
				),
			new Section('Procedures', 'procedures').addQuestion(questions.procedureDetails, procedureManageList),
			...dynamicProcedureSections,
			new Section('Outcome overview', 'outcome')
				.addQuestion(questions.outcomeDetails, outcomeManageList)
				.startMultiQuestionCondition('outcome-details', (response) =>
					manageListHasAnswer(response, questions.outcomeDetails)
				)
				.addQuestion(questions.partiesNotifiedDate)
				.addQuestion(questions.orderDecisionDispatchDate)
				.addQuestion(questions.sealedOrderReturnedDate)
				.addQuestion(questions.decisionPublishedDate)
				.endMultiQuestionCondition('outcome-details'),
			...dynamicOutcomeSections,
			new Section('Documents', 'documents').addQuestion(questions.filesLocation),
			new Section('Withdrawal or abeyance', 'withdrawal-abeyance')
				.addQuestion(questions.withdrawalDate)
				.addQuestion(questions.abeyanceStartDate)
				.addQuestion(questions.abeyanceEndDate),
			new Section('Costs', 'costs')
				.addQuestion(questions.rechargeable)
				.addQuestion(questions.finalCost)
				.addQuestion(questions.feeReceived)
				.addQuestion(questions.invoiceSent)
		],
		taskListUrl: '',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/cases/view/view.njk',
		journeyTitle: 'Case details',
		returnToListing: true,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}
