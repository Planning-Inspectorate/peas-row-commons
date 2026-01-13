import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { ManageListSection } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js';

import type { Request, Response } from 'express';
import { createProcedureSection } from './journey-utils.ts';

export const JOURNEY_ID = 'case-details';

export function createJourney(questions: Record<string, any>, response: Response, req: Request) {
	if (!req.params.id) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (no id param)`);
	}
	if (!req.baseUrl?.includes(req.params.id)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)`);
	}

	const procedureSections = [
		createProcedureSection('One', questions),
		createProcedureSection('Two', questions),
		createProcedureSection('Three', questions)
	];

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Overview', 'overview')
				.addQuestion(questions.caseType)
				.addQuestion(questions.caseSubtype)
				.addQuestion(questions.act)
				.addQuestion(questions.consentSought)
				.addQuestion(questions.inspectorBand)
				.addQuestion(questions.primaryProcedure),
			new Section('Case details', 'case-details')
				.addQuestion(questions.reference)
				.addQuestion(questions.externalReference)
				.addQuestion(questions.internalReference)
				.addQuestion(questions.caseName)
				.addQuestion(questions.caseStatus)
				.addQuestion(questions.advertisedModificationStatus)
				.addQuestion(questions.applicant)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.location)
				.addQuestion(questions.authority)
				.addQuestion(questions.priority),
			new Section('Team', 'team')
				.addQuestion(questions.caseOfficer)
				.addQuestion(
					questions.inspectorDetails,
					new ManageListSection().addQuestion(questions.inspector).addQuestion(questions.inspectorAllocatedDate)
				),
			new Section('Timetable', 'timetable')
				.addQuestion(questions.receivedDate)
				.addQuestion(questions.startDate)
				.addQuestion(questions.expectedSubmissionDate)
				.addQuestion(questions.targetDecisionDate)
				.addQuestion(questions.caseOfficerVerificationDate)
				.addQuestion(questions.proposedModificationsDate)
				.addQuestion(questions.objectionPeriodEndsDate)
				.addQuestion(questions.consentDeadlineDate)
				.addQuestion(questions.ogdDueDate)
				.addQuestion(questions.proposalLetterDate)
				.addQuestion(questions.expiryDate)
				.addQuestion(questions.partiesDecisionNotificationDeadlineDate),
			...procedureSections,
			new Section('Outcome', 'outcome')
				.addQuestion(questions.decisionType)
				.addQuestion(questions.decisionMaker)
				.addQuestion(questions.outcome)
				.addQuestion(questions.inTarget)
				.addQuestion(questions.outcomeDate)
				.addQuestion(questions.decisionReceivedDate)
				.addQuestion(questions.partiesNotifiedDate)
				.addQuestion(questions.orderDecisionDispatchDate)
				.addQuestion(questions.sealedOrderReturnedDate)
				.addQuestion(questions.decisionPublishedDate)
				.addQuestion(questions.isFencingPermanent),
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
