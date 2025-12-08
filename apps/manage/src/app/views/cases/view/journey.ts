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
			new Section('Overview', 'questions').addQuestion(questions.reference),
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
