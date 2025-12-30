import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import NumericValidator from '@planning-inspectorate/dynamic-forms/src/validator/numeric-validator.js';
import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';

import {
	INVOICE_STATUSES,
	CASE_STATUSES,
	ADVERTISED_MODIFICATIONS,
	PRIORITIES,
	CASE_TYPES,
	CASE_SUBTYPES,
	INSPECTOR_BANDS
} from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { referenceDataToRadioOptions } from '../create-a-case/questions-utils.ts';
import type { CaseOfficer } from './types.ts';

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

export const DOCUMENTS_QUESTIONS = {
	filesLocation: {
		type: COMPONENT_TYPES.TEXT_ENTRY,
		title: 'Files location',
		question: 'Where are the files located?',
		fieldName: 'filesLocation',
		url: 'files-location',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: 'Files location must be 250 characters or less'
				}
			})
		]
	}
};

export const COSTS_QUESTIONS = {
	rechargeable: {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'Rechargeable',
		question: 'Is this a rechargeable case?',
		fieldName: 'rechargeable',
		url: 'rechargeable',
		validators: [new RequiredValidator('Select yes if this is a rechargeable case')]
	},
	finalCost: {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT, // TODO: update to single line input once that has been updated to have prefixes in dynamic forms
		title: 'Final cost',
		question: 'What was the final cost?',
		fieldName: 'finalCost',
		url: 'final-cost',
		inputFields: [
			{
				fieldName: 'finalCost',
				prefix: { text: '£' },
				formatPrefix: '£'
			}
		],
		validators: [
			new RequiredValidator('Input must be numbers'),
			new NumericValidator({
				regex: /^$|^\d+(\.\d+)?$/,
				regexMessage: 'Input must be numbers'
			}),
			new NumericValidator({
				regex: /^$|^\d+(\.\d{1,2})?$/,
				regexMessage: 'Input must be valid monetary value'
			}),
			new NumericValidator({
				regex: /^$|^(?!0(\.00?)?$)/,
				regexMessage: 'Final cost must be more than £0.01'
			})
		]
	},
	feeReceived: {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'Fee received',
		question: 'Has the fee been received?',
		fieldName: 'feeReceived',
		url: 'fee-received',
		validators: [new RequiredValidator('Select yes if the fee has been received')]
	},
	invoiceSent: {
		type: COMPONENT_TYPES.RADIO, // Radio because it's Yes, No, Interim - so cannot be Bool
		title: 'Invoice sent',
		question: 'Has the invoice been sent?',
		fieldName: 'invoiceSent',
		url: 'invoice-sent',
		validators: [new RequiredValidator('Select yes if the invoice has been sent')],
		options: INVOICE_STATUSES.map((status) => ({ text: status.displayName, value: status.id }))
	}
};

export const ABEYANCE_QUESTIONS = {
	withdrawalDate: dateQuestion({
		fieldName: 'withdrawalDate',
		title: 'Withdrawal date',
		question: 'When was the case withdrawn?',
		url: 'withdrawal-date',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'withdrawal-date/remove'
				}
			]
		}
	}),
	abeyanceStartDate: dateQuestion({
		fieldName: 'abeyanceStartDate',
		title: 'Abeyance start date',
		question: 'When did the abeyance period start?',
		url: 'abeyance-start-date',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'abeyance-start-date/remove'
				}
			]
		}
	}),
	abeyanceEndDate: dateQuestion({
		fieldName: 'abeyanceEndDate',
		title: 'Abeyance end date',
		question: 'When did the abeyance period end?',
		url: 'abeyance-end-date',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'abeyance-end-date/remove'
				}
			]
		}
	})
};

export const CASE_DETAILS_QUESTIONS = {
	reference: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Case reference',
		question: 'not editable',
		fieldName: 'reference',
		url: '',
		validators: [],
		editable: false
	},
	externalReference: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'External reference',
		question: 'What is the external reference for the case?',
		fieldName: 'externalReference',
		url: 'external-reference',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 50,
					maxLengthMessage: 'External reference must be less than 50 characters'
				}
			})
		]
	},
	internalReference: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Internal reference',
		question: 'What is the internal reference for the case?',
		fieldName: 'internalReference',
		url: 'internal-reference',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 50,
					maxLengthMessage: 'Internal reference must be less than 50 characters'
				}
			})
		]
	},
	caseName: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Case name',
		question: 'What is the case name?',
		fieldName: 'name',
		url: 'case-name',
		validators: [
			new RequiredValidator('Enter the case name'),
			new StringValidator({
				maxLength: {
					maxLength: 200,
					maxLengthMessage: 'Case name must be between 1 and 200 characters'
				}
			})
		]
	},
	caseStatus: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Case status',
		question: 'What is the case status?',
		fieldName: 'statusId',
		url: 'case-status',
		validators: [],
		options: CASE_STATUSES.map((status) => ({ text: status.displayName, value: status.id })),
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'case-status/remove'
				}
			]
		}
	},
	advertisedModificationStatus: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Advertised modification status',
		question: 'Which round of advertised modifications is the case at?',
		fieldName: 'advertisedModificationId',
		url: 'advertised-modifications-status',
		validators: [],
		options: ADVERTISED_MODIFICATIONS.map((status) => ({ text: status.displayName, value: status.id })),
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'advertised-modifications-status/remove'
				}
			]
		}
	},
	applicant: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Applicant / Server',
		question: 'Who is the applicant?',
		hint: 'Enter either the applicant or server',
		fieldName: 'applicantName',
		url: 'applicant-server',
		validators: [
			new RequiredValidator('Enter the applicant'),
			new StringValidator({
				maxLength: {
					maxLength: 150,
					maxLengthMessage: 'Applicant must be less than 150 characters'
				}
			})
		]
	},
	siteAddress: {
		type: COMPONENT_TYPES.ADDRESS,
		title: 'Site address',
		question: 'What is the site address?',
		hint: 'Optional',
		fieldName: 'siteAddress',
		url: 'site-address',
		validators: [new AddressValidator()]
	},
	location: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Site location',
		question: 'What is the site location if no address was added?',
		hint: 'For example, name of common, village green, area or body of water',
		fieldName: 'location',
		url: 'location',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 150,
					maxLengthMessage: 'Location must be less than 150 characters'
				}
			})
		]
	},
	authority: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Authority (LPA, OMA, CRA)',
		question: 'Who is the authority?',
		hint: 'Enter the Local Planning Authority or Common Registration Authority (optional)',
		fieldName: 'authorityName',
		url: 'authority',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 150,
					maxLengthMessage: 'Authority must be less than 150 characters'
				}
			})
		]
	},
	priority: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Priority',
		question: 'What is the priority?',
		fieldName: 'priorityId',
		url: 'priority',
		validators: [],
		options: PRIORITIES.map((priority) => ({ text: priority.displayName, value: priority.id })),
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'priority/remove'
				}
			]
		}
	}
};

export const OVERVIEW_QUESTIONS = {
	caseType: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Case type',
		question: 'not editable',
		fieldName: 'typeId',
		url: '',
		validators: [],
		editable: false,
		options: CASE_TYPES.map((type) => ({ text: type.displayName, value: type.id }))
	},
	caseSubtype: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Subtype',
		question: 'not editable',
		fieldName: 'subTypeId',
		url: '',
		validators: [],
		editable: false,
		options: CASE_SUBTYPES.map((type) => ({ text: type.displayName, value: type.id }))
	},
	act: {
		type: COMPONENT_TYPES.TEXT_ENTRY,
		title: 'Act',
		question: 'What is the relevant legislation/act for this case?',
		fieldName: 'act',
		url: 'act',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: 'Act must be 250 characters or less'
				}
			})
		]
	},
	consentSought: {
		type: COMPONENT_TYPES.TEXT_ENTRY,
		title: 'Consent sought',
		question: 'Which consent has been sought for this case?',
		fieldName: 'consentSought',
		url: 'consent-sought',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 500,
					maxLengthMessage: 'Consent sought must be 500 characters or less'
				}
			})
		]
	},
	inspectorBand: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Inspector band',
		question: 'What is the inspector band?',
		fieldName: 'inspectorBandId',
		url: 'inspector-band',
		validators: [],
		options: INSPECTOR_BANDS.map((band) => ({ text: band.displayName, value: band.id })),
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'inspector-band/remove'
				}
			]
		}
	}
};

export const TEAM_QUESTIONS = {
	caseOfficer: {
		type: COMPONENT_TYPES.SELECT,
		title: 'Who is the assigned case officer?',
		question: 'Who is the assigned case officer?',
		fieldName: 'caseOfficerId',
		url: 'case-officer',
		validators: [new RequiredValidator('Select a case officer')]
	}
};

/**
 * Creates a team questions object, with the extra dynamic options for caseOfficers
 * added, based on the entra group members passed in.
 */
export function createTeamQuestions(
	teamQuestions: typeof TEAM_QUESTIONS,
	groupMembers: { caseOfficers: CaseOfficer[] }
) {
	const options = groupMembers.caseOfficers.map(referenceDataToRadioOptions);

	options.unshift({ text: '', value: '' });

	return {
		...teamQuestions,
		caseOfficer: {
			...teamQuestions.caseOfficer,
			options
		}
	};
}
