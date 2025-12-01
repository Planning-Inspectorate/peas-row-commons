import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';

interface DateQuestionProps {
	fieldName: string;
	title?: string;
	hint?: string;
	editable?: boolean;
	viewData?: Record<string, unknown>;
	question?: string;
	url?: string;
}

export function dateQuestion({
	fieldName,
	title,
	hint = 'For example, 27 3 2007',
	editable = true,
	viewData = {},
	question,
	url
}: DateQuestionProps) {
	if (!title) {
		title = camelCaseToSentenceCase(fieldName);
	}

	return {
		type: COMPONENT_TYPES.DATE,
		title: title,
		question: question || `What is the ${title?.toLowerCase()}?`,
		hint: hint,
		fieldName: fieldName,
		url: url || camelCaseToKebabCase(fieldName),
		validators: [new DateValidator(title)],
		editable: editable,
		viewData
	};
}

export function camelCaseToSentenceCase(str: string) {
	const sentence = str
		.split(/(?=[A-Z])/)
		.map((s) => s.toLowerCase())
		.join(' ');

	return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function camelCaseToKebabCase(str: string) {
	return str
		.split(/(?=[A-Z])/)
		.map((s) => s.toLowerCase())
		.join('-');
}

export const DATE_QUESTIONS = {
	receivedDate: dateQuestion({
		fieldName: 'receivedDate',
		title: 'Case received / submitted',
		question: 'What is the Received date for this case?',
		url: 'case-received-date'
	}),
	startDate: dateQuestion({
		fieldName: 'startDate',
		title: 'Start date',
		question: 'When did the case start?',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'start-date/remove'
				}
			]
		}
	}),
	objectionPeriodEndsDate: dateQuestion({
		fieldName: 'objectionPeriodEndsDate',
		title: 'Objection period ends',
		question: 'When does the objection period end?',
		url: 'objection-period-ends',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'objection-period-ends/remove'
				}
			]
		}
	}),
	expectedSubmissionDate: dateQuestion({
		fieldName: 'expectedSubmissionDate',
		title: 'Expected submission date',
		question: 'What is the expected submission date of the case?',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'expected-submission-date/remove'
				}
			]
		}
	}),
	offerForWrittenRepresentationDate: dateQuestion({
		fieldName: 'offerForWrittenRepresentationDate',
		title: 'Date offer for written representation',
		question: 'What date was written representation offered as the procedure type?',
		url: 'date-offer-written-representations',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'date-offer-written-representations/remove'
				}
			]
		}
	}),
	consentDeadlineDate: dateQuestion({
		fieldName: 'consentDeadlineDate',
		title: 'Deadline for consent',
		question: 'What is the deadline for consent?',
		url: 'deadline-consent',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'deadline-consent/remove'
				}
			]
		}
	}),
	targetEventDate: dateQuestion({
		fieldName: 'targetEventDate',
		title: 'Event target date',
		question: 'What is the target date for holding the event?',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'target-event-date/remove'
				}
			]
		}
	}),
	ogdDueDate: dateQuestion({
		fieldName: 'ogdDueDate',
		title: 'Date due in OGD',
		question: 'What date is the decision due to Other Government Department (OGD)?',
		url: 'date-due-in-ogd',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'date-due-in-ogd/remove'
				}
			]
		}
	}),
	proposalLetterDate: dateQuestion({
		fieldName: 'proposalLetterDate',
		title: 'Proposal letter date',
		question: 'What date was the proposal letter sent?',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'proposal-letter-date/remove'
				}
			]
		}
	}),
	expiryDate: dateQuestion({
		fieldName: 'expiryDate',
		title: 'Date decision must be issued by / expiry date',
		question: 'When must the decision by issued by?',
		url: 'date-decision-must-be-issued-by',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'date-decision-must-be-issued-by/remove'
				}
			]
		}
	}),
	partiesEventNotificationDeadlineDate: dateQuestion({
		fieldName: 'partiesEventNotificationDeadlineDate',
		title: 'Date parties must be notified of event',
		question: 'What date must the parties be notified of the event by?',
		url: 'date-parties-must-be-notified-event',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'date-parties-must-be-notified-event/remove'
				}
			]
		}
	}),
	partiesDecisionNotificationDeadlineDate: dateQuestion({
		fieldName: 'partiesDecisionNotificationDeadlineDate',
		title: 'Date to notify parties of decision',
		question: 'When should the parties be notified of a final decision by?',
		url: 'date-parties-must-be-notified-decision',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'date-parties-must-be-notified-decision/remove'
				}
			]
		}
	})
};
