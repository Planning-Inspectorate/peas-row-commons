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
	INSPECTOR_BANDS,
	DECISION_TYPES,
	OUTCOMES,
	PROCEDURE_STATUSES,
	PROCEDURES,
	PROCEDURE_EVENT_FORMATS,
	INQUIRY_OR_CONFERENCES,
	ADMIN_PROCEDURES,
	SITE_VISITS,
	OBJECTOR_STATUSES,
	CONTACT_TYPES
} from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { referenceDataToRadioOptions } from '../create-a-case/questions-utils.ts';
import type { CaseOfficer, PersonConfig } from './types.ts';
import { CUSTOM_COMPONENTS } from '@pins/peas-row-commons-lib/forms/custom-components/index.ts';
import { OUTCOME_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/outcome.ts';
import MultiFieldInputValidator from '@planning-inspectorate/dynamic-forms/src/validator/multi-field-input-validator.js';

type RadioOption = { text: string; value: string } | { divider: string };

// Adds a divider 'Or' between options
export const OBJECTOR_STATUSES_FORMATTED_WITH_DIVIDER = OBJECTOR_STATUSES.map(
	(s) => ({ text: s.displayName, value: s.id }) as RadioOption
).toSpliced(-1, 0, { divider: 'or' });

interface DateQuestionProps {
	fieldName: string;
	title?: string;
	hint?: string;
	editable?: boolean;
	viewData?: Record<string, unknown>;
	question?: string;
	url?: string;
	isDateTime?: boolean;
}

export function dateQuestion({
	fieldName,
	title,
	hint = 'For example, 27 3 2007',
	editable = true,
	viewData = {},
	question,
	url,
	isDateTime = false
}: DateQuestionProps) {
	if (!title) {
		title = camelCaseToSentenceCase(fieldName);
	}

	return {
		type: isDateTime ? CUSTOM_COMPONENTS.OPTIONAL_TIME_DATE_TIME : COMPONENT_TYPES.DATE,
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
	},
	primaryProcedure: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Primary procedure',
		question: 'Which procedure is the primary procedure?',
		fieldName: 'primaryProcedureStep',
		url: 'primary-procedure',
		validators: [new RequiredValidator('Select primary procedure')],
		options: [
			{ text: 'Procedure 1', value: 'ProcedureOne' },
			{ text: 'Procedure 2', value: 'ProcedureTwo' },
			{ text: 'Procedure 3', value: 'ProcedureThree' }
		],
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'primary-procedure/remove'
				}
			]
		}
	},
	relatedCaseDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Related case(s)',
		question: 'Check related case details',
		fieldName: 'relatedCaseDetails',
		url: 'check-related-cases',
		showAnswersInSummary: true,
		viewData: { emptyName: 'related case' }
	},
	addRelatedCase: {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT, // Multi because we want an H1 header and an inline question too.
		title: 'Add related case details',
		question: 'Add related case details',
		fieldName: 'addRelatedCase',
		url: 'add-related-cases',
		inputFields: [{ fieldName: 'relatedCaseReference', label: 'Related case reference' }],
		viewData: { tableHeader: 'Related case reference' },
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: 'relatedCaseReference',
						required: true,
						errorMessage: 'Enter related case reference',
						maxLength: { maxLength: 250, maxLengthMessage: 'Related case must be 250 characters or less' }
					}
				]
			})
		]
	},
	linkedCaseDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Linked case(s)',
		question: 'Check linked case details',
		fieldName: 'linkedCaseDetails',
		url: 'check-linked-cases',
		showAnswersInSummary: true,
		viewData: { emptyName: 'linked case' }
	},
	linkedCaseReference: {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT, // Multi because we want an H1 header and an inline question too.
		title: 'Add linked case details',
		question: 'Add linked case details',
		fieldName: 'addlinkedCase',
		url: 'linked-case-reference',
		inputFields: [{ fieldName: 'linkedCaseReference', label: 'Linked case reference' }],
		viewData: { tableHeader: 'Linked case reference' },
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: 'linkedCaseReference',
						required: true,
						errorMessage: 'Enter linked case reference',
						maxLength: { maxLength: 250, maxLengthMessage: 'Linked case must be 250 characters or less' }
					}
				]
			})
		]
	},
	isLead: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Is this the lead case?',
		question: 'Is this the lead case?',
		fieldName: 'linkedCaseIsLead',
		url: 'is-lead',
		viewData: { tableHeader: 'Lead?' },
		options: [
			{
				text: 'Yes',
				value: 'yes'
			},
			{
				text: 'No',
				value: 'no'
			}
		],
		validators: [new RequiredValidator('Select yes if this is the lead case')]
	}
};

export const TEAM_QUESTIONS = {
	caseOfficer: {
		type: COMPONENT_TYPES.SELECT,
		title: 'Case officer',
		question: 'Who is the assigned case officer?',
		fieldName: 'caseOfficerId',
		url: 'case-officer',
		validators: [new RequiredValidator('Select a case officer')]
	},
	inspectorDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Inspector(s)',
		question: 'Check inspector details',
		fieldName: 'inspectorDetails',
		url: 'inspector-details',
		showAnswersInSummary: true,
		viewData: { emptyName: 'inspector' }
	},
	inspector: {
		type: COMPONENT_TYPES.SELECT,
		title: 'Inspector',
		question: 'Who is the inspector?',
		fieldName: 'inspectorId',
		url: 'inspector',
		validators: [new RequiredValidator('Select an inspector')],
		viewData: { tableHeader: 'Inspector name' }
	},
	inspectorAllocatedDate: dateQuestion({
		fieldName: 'inspectorAllocatedDate',
		title: 'Inspector allocated date',
		question: 'What date was the inspector appointed?',
		url: 'inspector-allocated-date',
		viewData: { tableHeader: 'Date appointed' }
	})
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
		},
		inspector: {
			...teamQuestions.inspector,
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
		fieldName: 'decisionMakerId',
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
		validators: [new RequiredValidator('Select yes if the fencing is permanent')],
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

const getPrefix = (suffix: string) => `procedure${suffix}`;

/**
 * Dynamically creates the (3) procedure sections.
 *
 * We have (3) procedure sections: Procedure One, Two and Three.
 *
 * They have the exact same columns and eventually map to the same
 * table in the DB.
 *
 * As such they need UI specific keys to help differentiate them
 *
 * Follows format of 'procedure<number><keyName>' e.g. 'procedureOneHearingDate'
 *
 * This is then deciphered in the BE.
 */
export const createProcedureQuestions = (suffix: string) => {
	const prefix = getPrefix(suffix);

	return {
		[`${prefix}Type`]: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Procedure type',
			question: 'What is the procedure type?',
			fieldName: `${prefix}ProcedureTypeId`,
			url: 'type-of-procedure',
			validators: [new RequiredValidator('Select type of procedure')],
			options: PROCEDURES.map((status) => ({ text: status.displayName, value: status.id })),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'type-of-procedure/remove'
					}
				]
			}
		},
		[`${prefix}Status`]: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Procedure status',
			question: 'What is the status of the procedure?',
			fieldName: `${prefix}ProcedureStatusId`,
			url: 'status-of-procedure',
			validators: [],
			options: PROCEDURE_STATUSES.map((status) => ({ text: status.displayName, value: status.id }))
		},
		[`${prefix}SiteVisitDate`]: dateQuestion({
			fieldName: `${prefix}SiteVisitDate`,
			title: 'Site visit date',
			question: 'When is the site visit date? (optional)',
			url: 'site-visit-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'site-visit-date/remove'
					}
				]
			}
		}),
		[`${prefix}ProofsReceivedDate`]: dateQuestion({
			fieldName: `${prefix}ProofsOfEvidenceReceivedDate`,
			title: 'Proofs of evidence received',
			question: 'When were all the proofs of evidence received? (optional)',
			url: 'proofs-received-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'proofs-received-date/remove'
					}
				]
			}
		}),
		[`${prefix}StatementsReceivedDate`]: dateQuestion({
			fieldName: `${prefix}StatementsOfCaseReceivedDate`,
			title: 'Statements of case received',
			question: 'When were all the statements of case received? (optional)',
			url: 'statements-received-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'statements-received-date/remove'
					}
				]
			}
		}),
		[`${prefix}CaseOfficerVerificationDate`]: dateQuestion({
			fieldName: `${prefix}CaseOfficerVerificationDate`,
			title: 'Case officer verification date',
			question: 'When did the case officer verify the documents? (optional)',
			hint: 'Have all the necessary Statements of Case, Written Reps procedures, Notices, Proof of Posting and Proofs of Evidence been received?',
			url: 'case-officer-verification-case',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'case-officer-verification-case/remove'
					}
				]
			}
		}),
		[`${prefix}HearingTargetDate`]: dateQuestion({
			fieldName: `${prefix}HearingTargetDate`,
			title: 'Target hearing date',
			question: 'When is the target hearing date? (optional)',
			url: 'target-hearing-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'target-hearing-date/remove'
					}
				]
			}
		}),
		[`${prefix}HearingDateNotificationDate`]: dateQuestion({
			fieldName: `${prefix}HearingDateNotificationDate`,
			title: 'Date parties notified of hearing date',
			question: 'When were parties notified of the hearing date? (optional)',
			url: 'date-notified-of-hearing-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'date-notified-of-hearing-date/remove'
					}
				]
			}
		}),
		[`${prefix}HearingVenueNotificationDate`]: dateQuestion({
			fieldName: `${prefix}HearingVenueNotificationDate`,
			title: 'Date parties notified of hearing venue',
			question: 'When were parties notified of the hearing venue? (optional)',
			url: 'date-notified-of-hearing-venue',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'date-notified-of-hearing-venue/remove'
					}
				]
			}
		}),
		[`${prefix}ConfirmedHearingDate`]: dateQuestion({
			fieldName: `${prefix}ConfirmedHearingDate`,
			title: 'Confirmed hearing date',
			question: 'What is the hearing date? (optional)',
			url: 'confirmed-hearing-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'confirmed-hearing-date/remove'
					}
				]
			},
			isDateTime: true
		}),
		[`${prefix}HearingFormat`]: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Hearing type',
			question: 'What is the type of hearing?',
			fieldName: `${prefix}HearingFormatId`,
			url: 'type-of-hearing',
			validators: [new RequiredValidator('Select type of hearing')],
			options: PROCEDURE_EVENT_FORMATS.map((type) => ({ text: type.displayName, value: type.id })),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'type-of-hearing/remove'
					}
				]
			}
		},
		[`${prefix}HearingVenue`]: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Hearing venue',
			question: 'Where is the hearing?',
			fieldName: `${prefix}HearingVenue`,
			url: 'hearing-venue',
			validators: [new AddressValidator()]
		},
		[`${prefix}EarliestHearingDate`]: dateQuestion({
			fieldName: `${prefix}EarliestHearingDate`,
			title: 'Earliest potential hearing date',
			question: 'When is the earliest possible hearing date? (optional)',
			url: 'earliest-potential-hearing-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'earliest-potential-hearing-date/remove'
					}
				]
			}
		}),
		[`${prefix}HearingLength`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Length of event / estimated length (days)',
			question: 'How long will the hearing take?',
			fieldName: `${prefix}LengthOfHearingEvent`,
			url: 'estimated-hearing-length',
			suffix: 'days',
			hint: 'Estimated or actual length',
			validators: [
				new RequiredValidator('Enter the length of event'),
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Length of event must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}HearingInTarget`]: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Hearing in target?',
			question: 'Was the hearing completed in the target timeframe?',
			fieldName: `${prefix}HearingInTarget`,
			url: 'hearing-in-target',
			validators: [new RequiredValidator('Select yes if the hearing was completed in the target timeframe')]
		},
		[`${prefix}HearingClosedDate`]: dateQuestion({
			fieldName: `${prefix}HearingClosedDate`,
			title: 'Date hearing closed',
			question: 'When did the hearing close? (optional)',
			url: 'date-hearing-closed',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'date-hearing-closed/remove'
					}
				]
			}
		}),
		[`${prefix}HearingPreparationTime`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Preparation time (days)',
			question: 'How long is the hearing preparation time? (optional)',
			fieldName: `${prefix}HearingPreparationTimeDays`,
			url: 'hearing-preparation-time',
			suffix: 'days',
			validators: [
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Hearing preparation time must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}HearingTravelTime`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Travel time (days)',
			question: 'How long is the hearing travel time? (optional)',
			fieldName: `${prefix}HearingTravelTimeDays`,
			url: 'hearing-travel-time',
			suffix: 'days',
			validators: [
				new RequiredValidator('Enter the hearing travel time'),
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Hearing travel time must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}HearingSittingTime`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Sitting time (days)',
			question: 'How long is the hearing sitting time? (optional)',
			fieldName: `${prefix}HearingSittingTimeDays`,
			url: 'hearing-sitting-time',
			suffix: 'days',
			validators: [
				new RequiredValidator('Enter the hearing sitting time'),
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Hearing sitting time must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}HearingReportingTime`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Reporting time (days)',
			question: 'How long is the hearing reporting time? (optional)',
			fieldName: `${prefix}HearingReportingTimeDays`,
			url: 'hearing-reporting-time',
			suffix: 'days',
			validators: [
				new RequiredValidator('Enter the hearing reporting time'),
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Hearing reporting time must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}InquiryTargetDate`]: dateQuestion({
			fieldName: `${prefix}InquiryTargetDate`,
			title: 'Inquiry target date',
			question: 'When is the target inquiry date? (optional)',
			url: 'target-inquiry-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'target-inquiry-date/remove'
					}
				]
			}
		}),
		[`${prefix}InquiryDateNotificationDate`]: dateQuestion({
			fieldName: `${prefix}InquiryDateNotificationDate`,
			title: 'Date parties notified of inquiry date',
			question: 'When were parties notified of the inquiry date? (optional)',
			url: 'date-notified-of-inquiry-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'date-notified-of-inquiry-date/remove'
					}
				]
			}
		}),
		[`${prefix}InquiryVenueNotificationDate`]: dateQuestion({
			fieldName: `${prefix}InquiryVenueNotificationDate`,
			title: 'Date parties notified of inquiry venue',
			question: 'When were parties notified of the inquiry venue? (optional)',
			url: 'date-notified-of-inquiry-venue',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'date-notified-of-inquiry-venue/remove'
					}
				]
			}
		}),
		[`${prefix}InquiryOrConference`]: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Pre inquiry meeting or case management conference',
			question: 'Will there be a pre inquiry meeting or a case management conference?',
			fieldName: `${prefix}InquiryOrConferenceId`,
			url: 'pim-or-cmc',
			validators: [
				new RequiredValidator('Select whether there will be a pre inquiry meeting or case management conference')
			],
			options: INQUIRY_OR_CONFERENCES.map((type) => ({ text: type.displayName, value: type.id })),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'pim-or-cmc/remove'
					}
				]
			}
		},
		[`${prefix}PreInquiryMeetingDate`]: dateQuestion({
			fieldName: `${prefix}PreInquiryMeetingDate`,
			title: 'Pre inquiry meeting date',
			question: 'When is the pre inquiry meeting? (optional)',
			url: 'pre-inquiry-meeting-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'pre-inquiry-meeting-date/remove'
					}
				]
			},
			isDateTime: true
		}),
		[`${prefix}PreInquiryFormat`]: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Pre inquiry meeting format',
			question: 'What is the format of the pre inquiry meeting?',
			fieldName: `${prefix}PreInquiryMeetingFormatId`,
			url: 'pre-inquiry-type',
			validators: [new RequiredValidator('Select the format of the pre inquiry meeting')],
			options: PROCEDURE_EVENT_FORMATS.filter((f) => f.id !== 'hybrid').map((type) => ({
				text: type.displayName,
				value: type.id
			})),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'pre-inquiry-type/remove'
					}
				]
			}
		},
		[`${prefix}PreInquiryNoteSent`]: dateQuestion({
			fieldName: `${prefix}PreInquiryNoteSentDate`,
			title: 'Pre inquiry meeting note sent',
			question: 'When was the pre inquiry meeting note sent? (optional)',
			url: 'pre-inquiry-note-sent',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'pre-inquiry-note-sent/remove'
					}
				]
			}
		}),
		[`${prefix}CmcDate`]: dateQuestion({
			fieldName: `${prefix}ConferenceDate`,
			title: 'Case management conference date',
			question: 'When is the case management conference? (optional)',
			url: 'cmc-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'cmc-date/remove'
					}
				]
			},
			isDateTime: true
		}),
		[`${prefix}CmcFormat`]: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Case management conference type',
			question: 'What is the type of the case management conference?',
			fieldName: `${prefix}ConferenceFormatId`,
			url: 'case-management-conference-type',
			validators: [new RequiredValidator('Select the type of the case management conference')],
			options: PROCEDURE_EVENT_FORMATS.filter((f) => f.id !== 'hybrid').map((type) => ({
				text: type.displayName,
				value: type.id
			})),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'case-management-conference-type/remove'
					}
				]
			}
		},
		[`${prefix}CmcVenue`]: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Case management conference venue',
			question: 'Where is the case management conference?',
			fieldName: `${prefix}ConferenceVenue`,
			url: 'case-management-conference-venue',
			validators: [new AddressValidator()]
		},
		[`${prefix}CmcNoteSentDate`]: dateQuestion({
			fieldName: `${prefix}ConferenceNoteSentDate`,
			title: 'Case management conference note sent',
			question: 'When was the case management note sent? (optional)',
			url: 'case-management-conference-note-sent',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'case-management-conference-note-sent/remove'
					}
				]
			}
		}),
		[`${prefix}ConfirmedInquiryDate`]: dateQuestion({
			fieldName: `${prefix}ConfirmedInquiryDate`,
			title: 'Confirmed inquiry date',
			question: 'What is the inquiry date? (optional)',
			url: 'inquiry-date-confirmed',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'inquiry-date-confirmed/remove'
					}
				]
			}
		}),
		[`${prefix}InquiryFormat`]: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Inquiry type',
			question: 'What is the inquiry type?',
			fieldName: `${prefix}InquiryFormatId`,
			url: 'inquiry-type',
			validators: [new RequiredValidator('Select the inquiry type')],
			options: PROCEDURE_EVENT_FORMATS.map((type) => ({ text: type.displayName, value: type.id })),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'inquiry-type/remove'
					}
				]
			}
		},
		[`${prefix}InquiryVenue`]: {
			type: COMPONENT_TYPES.ADDRESS,
			title: 'Inquiry venue',
			question: 'What is the inquiry venue?',
			fieldName: `${prefix}InquiryVenue`,
			url: 'inquiry-venue',
			validators: [new AddressValidator()]
		},
		[`${prefix}EarliestInquiryDate`]: dateQuestion({
			fieldName: `${prefix}EarliestInquiryDate`,
			title: 'Earliest potential inquiry date',
			question: 'When is the earliest possible inquiry date? (optional)',
			url: 'earliest-potential-inquiry-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'earliest-potential-inquiry-date/remove'
					}
				]
			}
		}),
		[`${prefix}InquiryLength`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Length of event / estimated length (days)',
			question: 'How long will the inquiry take?',
			fieldName: `${prefix}LengthOfInquiryEvent`,
			url: 'estimated-inquiry-length',
			suffix: 'days',
			validators: [
				new RequiredValidator('Enter the length of event'),
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Length of event must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}InquiryFinishedDate`]: dateQuestion({
			fieldName: `${prefix}InquiryFinishedDate`,
			title: 'Date inquiry finished',
			question: 'When did the inquiry end? (optional)',
			url: 'date-inquiry-finished',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'date-inquiry-finished/remove'
					}
				]
			}
		}),
		[`${prefix}InquiryInTarget`]: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Event in target?',
			question: 'Was the inquiry completed in the target timeframe?',
			fieldName: `${prefix}InquiryInTarget`,
			url: 'inquiry-in-target',
			validators: [new RequiredValidator('Select whether the inquiry was completed in the target timeframe')]
		},
		[`${prefix}InquiryClosedDate`]: dateQuestion({
			fieldName: `${prefix}InquiryClosedDate`,
			title: 'Date inquiry closed',
			question: 'When did the inquiry close? (optional)',
			url: 'date-inquiry-closed',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'date-inquiry-closed/remove'
					}
				]
			}
		}),
		[`${prefix}PartiesNotifiedOfInquiryDate`]: dateQuestion({
			fieldName: `${prefix}PartiesNotifiedOfInquiryDate`,
			title: 'Date parties must be notified of inquiry',
			question: 'When must parties be notified of the inquiry? (optional)',
			url: 'party-notified-inquiry-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'party-notified-inquiry-date/remove'
					}
				]
			}
		}),
		[`${prefix}PartiesNotifiedOfHearingDate`]: dateQuestion({
			fieldName: `${prefix}PartiesNotifiedOfHearingDate`,
			title: 'Date parties must be notified of hearing',
			question: 'When must parties be notified of the hearing? (optional)',
			url: 'party-notified-hearing-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'party-notified-hearing-date/remove'
					}
				]
			}
		}),
		[`${prefix}InquiryPreparationTime`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Preparation time (days)',
			question: 'How long is the inquiry preparation time? (optional)',
			fieldName: `${prefix}InquiryPreparationTimeDays`,
			url: 'inquiry-preparation-time',
			suffix: 'days',
			validators: [
				new RequiredValidator('Enter the inquiry preparation time'),
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Inquiry preparation time must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}InquiryTravelTime`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Travel time (days)',
			question: 'How long is the inquiry travel time? (optional)',
			fieldName: `${prefix}InquiryTravelTimeDays`,
			url: 'inquiry-travel-time',
			suffix: 'days',
			validators: [
				new RequiredValidator('Enter the inquiry travel time'),
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Inquiry travel time must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}InquirySittingTime`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Sitting time (days)',
			question: 'How long is the inquiry sitting time? (optional)',
			fieldName: `${prefix}InquirySittingTimeDays`,
			url: 'inquiry-sitting-time',
			suffix: 'days',
			validators: [
				new RequiredValidator('Enter the inquiry sitting time'),
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Inquiry sitting time must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}InquiryReportingTime`]: {
			type: COMPONENT_TYPES.NUMBER,
			title: 'Reporting time (days)',
			question: 'How long is the inquiry reporting time? (optional)',
			fieldName: `${prefix}InquiryReportingTimeDays`,
			url: 'inquiry-reporting-time',
			suffix: 'days',
			validators: [
				new RequiredValidator('Enter the inquiry reporting time'),
				new NumericValidator({
					regex: /^$|^\d+(\.\d+)?$/,
					regexMessage: 'Inquiry reporting time must only contain numbers'
				})
			],
			viewData: { width: 5 }
		},
		[`${prefix}InHouseDate`]: dateQuestion({
			fieldName: `${prefix}InHouseDate`,
			title: 'In house date',
			question: 'When was Admin in house procedure done? (optional)',
			url: 'in-house-date',
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'in-house-date/remove'
					}
				]
			}
		}),
		[`${prefix}OfferWrittenRepsDate`]: dateQuestion({
			fieldName: `${prefix}OfferForWrittenRepresentationsDate`,
			title: 'Date offer for written representations',
			question: 'When was the date offered for written representations? (optional)',
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
		[`${prefix}AdminType`]: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Admin procedure type',
			question: 'What is the admin procedure type?',
			fieldName: `${prefix}AdminProcedureType`,
			url: 'admin-procedure-type',
			validators: [new RequiredValidator('Select the admin procedure type')],
			options: ADMIN_PROCEDURES.map((status) => ({ text: status.displayName, value: status.id })),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'admin-procedure-type/remove'
					}
				]
			}
		},
		[`${prefix}SiteVisitType`]: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Type of site visit',
			question: 'What type of site visit is it?',
			fieldName: `${prefix}SiteVisitTypeId`,
			url: 'type-of-site-visit',
			validators: [new RequiredValidator('Select the type of site visit')],
			options: SITE_VISITS.map((status) => ({ text: status.displayName, value: status.id })),
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: 'type-of-site-visit/remove'
					}
				]
			}
		}
	};
};

const createPersonQuestions = ({ section, db, url, label }: PersonConfig) => {
	const labelLower = label.toLowerCase();

	return {
		[`${section}Name`]: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: label,
			question: `Who is the ${labelLower}?`,
			fieldName: `${section}Name`,
			url: `${url}-name`,
			hint: 'Enter the name of the individual, the organisation, or both.',
			viewData: { tableHeader: 'Name' },
			inputFields: [
				{ fieldName: `${db}FirstName`, label: 'First name' },
				{ fieldName: `${db}LastName`, label: 'Last name' },
				{ fieldName: `${db}OrgName`, label: `${label} company or organisation name` }
			],
			validators: [
				new MultiFieldInputValidator({
					fields: [
						{
							fieldName: `${db}FirstName`,
							required: false,
							errorMessage: `Enter ${labelLower} first name`,
							maxLength: { maxLength: 250, maxLengthMessage: `${label} first name must be less than 250 characters` }
						},
						{
							fieldName: `${db}LastName`,
							required: false,
							errorMessage: `Enter ${labelLower} last name`,
							maxLength: { maxLength: 250, maxLengthMessage: `${label} last name must be less than 250 characters` }
						},
						{
							fieldName: `${db}OrgName`,
							required: false,
							maxLength: {
								maxLength: 250,
								maxLengthMessage: 'Company or organisation name must be less than 250 characters'
							}
						}
					]
				})
			]
		},
		[`${section}Address`]: {
			type: COMPONENT_TYPES.ADDRESS,
			title: `${label} address details`,
			question: `${label} address details`,
			hint: 'Optional',
			fieldName: `${db}Address`,
			url: `${url}-address`,
			validators: [new AddressValidator()],
			viewData: { tableHeader: 'Address' }
		},
		[`${section}ContactDetails`]: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: `${label === 'Contact' ? 'Contact details' : 'Objector contact details'}`,
			question: `${label === 'Contact' ? 'What are the contact details?' : 'Objector contact details'} (optional)`,
			fieldName: `${section}Details`,
			url: `${url}-contact-details`,
			viewData: { tableHeader: 'Contact' },
			inputFields: [
				{ fieldName: `${db}Email`, label: 'Email address' },
				{ fieldName: `${db}TelephoneNumber`, label: 'Phone number' }
			],
			validators: [
				new MultiFieldInputValidator({
					fields: [
						{
							fieldName: `${db}Email`,
							required: false,
							maxLength: { maxLength: 250, maxLengthMessage: `${label} email must be less than 250 characters` }
						},
						{
							fieldName: `${db}TelephoneNumber`,
							required: false,
							maxLength: { maxLength: 15, maxLengthMessage: `${label} phone number must be less than 15 characters` }
						}
					]
				})
			]
		}
	};
};

export const KEY_CONTACTS_QUESTIONS = {
	objectorDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Objector(s)',
		question: 'Check objector details',
		fieldName: 'objectorDetails',
		url: 'objector-details',
		viewData: { emptyName: 'objector' }
	},
	...createPersonQuestions({
		section: 'objector',
		db: 'objector',
		url: 'objector',
		label: 'Objector'
	}),
	objectorStatus: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Objector status',
		question: 'What is the objector status?',
		fieldName: 'objectorStatusId',
		url: 'objector-status',
		validators: [new RequiredValidator("Select the status of the objector, or 'Not applicable'")],
		options: OBJECTOR_STATUSES_FORMATTED_WITH_DIVIDER,
		viewData: { tableHeader: 'Status' }
	},
	contactDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Contact(s)',
		question: 'Check contact details',
		fieldName: 'contactDetails',
		url: 'contact-details',
		viewData: { emptyName: 'contact' }
	},
	contactType: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Contact type',
		question: 'What is your contact type?',
		fieldName: 'contactTypeId',
		url: 'contact-type',
		validators: [new RequiredValidator('Select contact type')],
		options: CONTACT_TYPES.filter((type) => type.id !== 'objector').map((type) => ({
			text: type.displayName,
			value: type.id
		})),
		viewData: { tableHeader: 'Contact type' }
	},
	...createPersonQuestions({
		section: 'contact',
		db: 'contact',
		url: 'contact',
		label: 'Contact'
	})
};

// All questions, exported for testing.
export const ALL_QUESTIONS = {
	...DATE_QUESTIONS,
	...DOCUMENTS_QUESTIONS,
	...COSTS_QUESTIONS,
	...ABEYANCE_QUESTIONS,
	...CASE_DETAILS_QUESTIONS,
	...TEAM_QUESTIONS,
	...OVERVIEW_QUESTIONS,
	...OUTCOME_QUESTIONS,
	...createProcedureQuestions('One'),
	...KEY_CONTACTS_QUESTIONS
};
