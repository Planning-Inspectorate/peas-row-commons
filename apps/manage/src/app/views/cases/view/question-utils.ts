import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import NumericValidator from '@planning-inspectorate/dynamic-forms/src/validator/numeric-validator.js';
import MultiFieldInputValidator from '@planning-inspectorate/dynamic-forms/src/validator/multi-field-input-validator.js';
import AddressValidator from '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js';

import {
	INVOICE_STATUSES,
	CASE_STATUSES,
	ADVERTISED_MODIFICATIONS,
	PRIORITIES,
	CASE_TYPES,
	CASE_SUBTYPES,
	INSPECTOR_BANDS,
	DECISION_TYPES,
	OUTCOMES
} from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { referenceDataToRadioOptions } from '../create-a-case/questions-utils.ts';
import type { CaseOfficer } from './types.ts';
import { CUSTOM_COMPONENTS } from '@pins/peas-row-commons-lib/forms/custom-components/index.ts';
import { OUTCOME_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/outcome.ts';

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
		url: 'objection-period-end-date',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'objection-period-end-date/remove'
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
	ogdDueDate: dateQuestion({
		fieldName: 'ogdDueDate',
		title: 'Date due to Other Government Department (OGD)',
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
	}),
	targetDecisionDate: dateQuestion({
		fieldName: 'targetDecisionDate',
		title: 'Target decision date',
		question: 'What is the target decision date?',
		url: 'target-decision-date',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'target-decision-date/remove'
				}
			]
		}
	}),
	caseOfficerVerificationDate: dateQuestion({
		fieldName: 'caseOfficerVerificationDate',
		title: 'Case officer verification date',
		question: 'When did the case officer verify the case?',
		url: 'case-officer-verification-date',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'case-officer-verification-date/remove'
				}
			]
		}
	}),
	proposedModificationsDate: dateQuestion({
		fieldName: 'proposedModificationsDate',
		title: 'Date proposed modifications advertised',
		question: 'When were the proposed modifications advertised?',
		url: 'date-proposed-modifications-advertised',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'date-proposed-modifications-advertised/remove'
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
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
		title: 'Applicant / Server',
		question: 'What was the final cost?',
		fieldName: 'applicantId',
		url: 'applicant-server',
		inputFields: [
			{
				fieldName: 'applicantName',
				label: 'Applicant / server name'
			},
			{
				fieldName: 'applicantEmail',
				label: 'Email'
			},
			{
				fieldName: 'applicantTelephoneNumber',
				label: 'Telephone number'
			}
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: 'applicantName',
						errorMessage: 'Enter the applicant name',
						required: true,
						regex: {
							regex: /^.{0,249}$/,
							regexMessage: 'Name must be less than 250 characters'
						}
					},
					{
						fieldName: 'applicantEmail',
						errorMessage: 'Enter an email address',
						regex: {
							regex: /^.{0,249}$/,
							regexMessage: 'Email must be less than 250 characters'
						}
					},
					{
						fieldName: 'applicantTelephoneNumber',
						errorMessage: 'Enter a telephone number',
						regex: {
							regex: /^.{0,14}$/,
							regexMessage: 'Telephone number must be less than 15 characters'
						}
					}
				]
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
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
		title: 'Authority (LPA,OMA, CRA)',
		question: 'Who is the authority?',
		hint: 'Enter the Local Planning Authority or Common Registration Authority (optional)',
		fieldName: 'authorityId',
		url: 'authority',
		inputFields: [
			{
				fieldName: 'authorityName',
				label: 'Authority name'
			},
			{
				fieldName: 'authorityEmail',
				label: 'Email'
			},
			{
				fieldName: 'authorityTelephoneNumber',
				label: 'Telephone number'
			}
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: 'authorityName',
						errorMessage: 'Enter the authority name',
						required: true,
						regex: {
							regex: /^.{0,249}$/,
							regexMessage: 'Name must be less than 250 characters'
						}
					},
					{
						fieldName: 'authorityEmail',
						errorMessage: 'Enter an email address',
						regex: {
							regex: /^.{0,249}$/,
							regexMessage: 'Email must be less than 250 characters'
						}
					},
					{
						fieldName: 'authorityTelephoneNumber',
						errorMessage: 'Enter a telephone number',
						regex: {
							regex: /^.{0,14}$/,
							regexMessage: 'Telephone number must be less than 15 characters'
						}
					}
				]
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
		validators: [new RequiredValidator('Select inspector band')],
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

export const OUTCOME_QUESTIONS = {
	decisionType: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Type of decision or report',
		question: 'What is the type of decision or report?',
		fieldName: 'decisionTypeId',
		url: 'type-of-decision',
		validators: [new RequiredValidator('Select a type of decision or report')],
		options: DECISION_TYPES.map((status) => ({ text: status.displayName, value: status.id })),
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'type-of-decision/remove'
				}
			]
		}
	},
	decisionMaker: {
		type: COMPONENT_TYPES.SELECT,
		title: 'Decision maker',
		question: 'Who is the decision maker?',
		fieldName: 'decisionMakerEntraId',
		url: 'decision-maker',
		validators: [new RequiredValidator('Select the decision maker')]
	},
	outcome: {
		type: CUSTOM_COMPONENTS.CONDITIONAL_TEXT_OPTIONS,
		title: 'Outcome',
		question: 'What is the outcome?',
		fieldName: 'outcomeId',
		url: 'outcome',
		validators: [new RequiredValidator('Select the outcome')],
		options: OUTCOMES.map((status) => {
			const option: any = {
				text: status.displayName,
				value: status.id
			};

			if (status.id === OUTCOME_ID.GRANTED_WITH_CONDITIONS) {
				option.conditional = {
					question: 'Condition details',
					fieldName: 'grantedWithConditionsComment',
					type: 'textarea'
				};
			}

			if (status.id === OUTCOME_ID.PROPOSE_NOT_TO_CONFIRM) {
				option.conditional = {
					question: 'Other details',
					fieldName: 'proposeNotToConfirmComment',
					type: 'textarea'
				};
			}

			return option;
		})
	},
	inTarget: {
		type: COMPONENT_TYPES.BOOLEAN,
		title: 'In target?',
		question: 'Was the decision received in the target timeframe?',
		fieldName: 'inTarget',
		url: 'in-target',
		validators: [new RequiredValidator('Select yes if the decision was received in the target timeframe')]
	},
	outcomeDate: dateQuestion({
		fieldName: 'outcomeDate',
		title: 'Outcome date',
		question: 'Outcome date',
		hint: 'Date of the decision, proposal, report or recommendation. For example 27 3 2007.',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'outcome-date/remove'
				}
			]
		}
	}),
	decisionReceivedDate: dateQuestion({
		fieldName: 'decisionReceivedDate',
		title: 'Decision received',
		question: 'Decision received (optional)',
		hint: 'Required if the decision was determined external to PINS. For example 27 3 2007.',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'decision-received-date/remove'
				}
			]
		}
	}),
	partiesNotifiedDate: dateQuestion({
		fieldName: 'partiesNotifiedDate',
		title: 'Parties notified of outcome',
		question: 'When were the parties notified of the outcome?',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'parties-notified-date/remove'
				}
			]
		}
	}),
	orderDecisionDispatchDate: dateQuestion({
		fieldName: 'orderDecisionDispatchDate',
		title: 'Order decision dispatch',
		question: 'When was the decision order dispatched?',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'order-decision-dispatch-date/remove'
				}
			]
		}
	}),
	sealedOrderReturnedDate: dateQuestion({
		fieldName: 'sealedOrderReturnedDate',
		title: 'Sealed order returned',
		question: 'When was the sealed order returned?',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'sealed-order-returned-date/remove'
				}
			]
		}
	}),
	decisionPublishedDate: dateQuestion({
		fieldName: 'decisionPublishedDate',
		title: 'Decision published',
		question: 'When was the decision published?',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'decision-published-date/remove'
				}
			]
		}
	}),
	isFencingPermanent: {
		type: CUSTOM_COMPONENTS.FENCING_PERMANENT,
		title: 'Is fencing permanent',
		question: 'Is the fencing permanent?',
		fieldName: 'isFencingPermanent',
		url: 'fencing-permanent',
		validators: [new RequiredValidator('Select yes if the decision was received in the target timeframe')],
		options: [
			{
				text: 'Yes',
				value: 'yes'
			},
			{
				text: 'No',
				value: 'no',
				conditional: {
					fieldName: 'fencingPermanentComment',
					type: 'textarea'
				}
			}
		]
	}
};

/**
 * Creates the Outcome questions, adding in the group members from
 * entra for decision makers.
 */
export function createOutcomeQuestions(
	outcomeQuestions: typeof OUTCOME_QUESTIONS,
	groupMembers: { caseOfficers: CaseOfficer[] }
) {
	const options = groupMembers.caseOfficers.map(referenceDataToRadioOptions);

	options.unshift({ text: '', value: '' });

	return {
		...outcomeQuestions,
		decisionMaker: {
			...outcomeQuestions.decisionMaker,
			options
		}
	};
}
