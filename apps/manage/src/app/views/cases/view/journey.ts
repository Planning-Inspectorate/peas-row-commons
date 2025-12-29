import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';

import type { Request, Response } from 'express';

export const JOURNEY_ID = 'case-details';

export function createJourney(questions: Record<string, any>, response: Response, req: Request) {
	if (!req.params.id) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (no id param)`);
	}
	if (!req.baseUrl?.includes(req.params.id)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
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
			new Section('Timetable', 'timetable')
				.addQuestion(questions.receivedDate)
				.addQuestion(questions.startDate)
				.addQuestion(questions.objectionPeriodEndsDate)
				.addQuestion(questions.expectedSubmissionDate)
				.addQuestion(questions.offerForWrittenRepresentationDate)
				.addQuestion(questions.consentDeadlineDate)
				.addQuestion(questions.partiesEventNotificationDeadlineDate)
				.addQuestion(questions.targetEventDate)
				.addQuestion(questions.ogdDueDate)
				.addQuestion(questions.proposalLetterDate)
				.addQuestion(questions.expiryDate)
				.addQuestion(questions.partiesDecisionNotificationDeadlineDate),
			new Section('Documents', 'documents').addQuestion(questions.filesLocation),
			new Section('Costs', 'costs')
				.addQuestion(questions.rechargeable)
				.addQuestion(questions.finalCost)
				.addQuestion(questions.feeReceived)
				.addQuestion(questions.invoiceSent),
			new Section('Withdrawal or abeyance', 'withdrawal-abeyance')
				.addQuestion(questions.withdrawalDate)
				.addQuestion(questions.abeyanceStartDate)
				.addQuestion(questions.abeyanceEndDate),
			new Section('Team', 'team').addQuestion(questions.caseOfficer)
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
