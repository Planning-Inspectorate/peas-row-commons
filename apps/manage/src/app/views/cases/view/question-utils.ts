import type { EntraGroupMembers } from '#util/entra-groups-types.ts';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { AUTHORITIES as AUTHORITIES_DEV } from '@pins/peas-row-commons-database/src/seed/data-authorities-dev.ts';
import { AUTHORITIES as AUTHORITIES_PROD } from '@pins/peas-row-commons-database/src/seed/data-authorities-prod.ts';
import { ACT_SECTIONS } from '@pins/peas-row-commons-database/src/seed/static-data/act-sections.ts';
import { ADMIN_PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/admin-procedure-type.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/contact-type.ts';
import { DECISION_MAKER_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/decision-maker-type.ts';
import { OUTCOME_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/outcome.ts';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/procedures.ts';
import {
	ADMIN_PROCEDURES,
	ADVERTISED_MODIFICATIONS,
	CASE_STATUSES,
	CASE_SUBTYPES,
	CASE_TYPES,
	CONTACT_TYPES,
	DECISION_MAKER_TYPES,
	DECISION_TYPES,
	INSPECTOR_BANDS,
	INVOICE_STATUSES,
	OBJECTOR_STATUSES,
	OUTCOMES,
	PRIORITIES,
	PROCEDURES,
	SITE_VISITS
} from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import { LEGACY_ACT_SECTIONS } from '@pins/peas-row-commons-database/src/seed/static-data/legacy/act-sections.ts';
import { LEGACY_CONTACT_TYPES } from '@pins/peas-row-commons-database/src/seed/static-data/legacy/contact-types.ts';
import { GENERAL_CONSTANTS } from '@pins/peas-row-commons-lib/constants/general.ts';
import { INSPECTOR_CONSTANTS } from '@pins/peas-row-commons-lib/constants/inspectors.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';
import type { MpescQuestionProps } from '@pins/peas-row-commons-lib/forms/custom-components/index.ts';
import { CUSTOM_COMPONENTS } from '@pins/peas-row-commons-lib/forms/custom-components/index.ts';
import type TableManageListQuestion from '@pins/peas-row-commons-lib/forms/custom-components/manage-list-table/question.ts';
import ManageListItemsCompleteValidator from '@pins/peas-row-commons-lib/forms/custom-components/manage-list-table/validator.ts';
import { createPersonQuestions } from '@pins/peas-row-commons-lib/util/contact.ts';
import CustomDatePeriodValidator from '@pins/peas-row-commons-lib/validators/custom-date-period-validator.ts';
import { ManageListItemsValidator } from '@pins/peas-row-commons-lib/validators/linked-cases-validator.ts';
import { ManageListCrossFieldValidator } from '@pins/peas-row-commons-lib/validators/manage-list-cross-field-validator.ts';
import type { BaseValidator, Question, SummaryFormatterContext } from '@planning-inspectorate/dynamic-forms';
import {
	AddressValidator,
	BOOLEAN_OPTIONS,
	COMPONENT_TYPES,
	CrossQuestionValidator,
	DateValidator,
	MultiFieldInputValidator,
	NumericValidator,
	RequiredValidator,
	StringValidator
} from '@planning-inspectorate/dynamic-forms';
import nunjucks from 'nunjucks';
import { ENVIRONMENT_NAME, loadEnvironmentConfig } from '../../../config.ts';
import { referenceDataToRadioOptions } from '../create-a-case/questions-utils.ts';
import { buildExistingLeadCaseMap, getLinkedCaseDetailRows, type OtherCaseWithParent } from './linked-cases.ts';
import type { UserMap } from './types.ts';

type RadioOption = { text: string; value: string } | { divider: string };

// Adds a divider 'Or' between options
export const OBJECTOR_STATUSES_FORMATTED_WITH_DIVIDER = OBJECTOR_STATUSES.map(
	(s) => ({ text: s.displayName, value: s.id }) as RadioOption
).toSpliced(-1, 0, { divider: 'or' });

const getAuthorityOptions = () => {
	let LPAs: Prisma.AuthorityUncheckedCreateInput[];
	try {
		const env = loadEnvironmentConfig();
		// this is to avoid a database read when the data is static - but it does vary by environment
		// the options here should match the dev/prod seed scripts
		LPAs = env === ENVIRONMENT_NAME.PROD ? AUTHORITIES_PROD : AUTHORITIES_DEV;
	} catch (error) {
		// Fallback to dev data if there's an issue loading the config or data, to ensure the app can still function.
		// This would likely only be triggered by tests
		console.error(error);
		LPAs = AUTHORITIES_DEV;
	}
	return [
		{ text: '', value: '' }, // ensure there is a 'null' option so the first LPA isn't selected by default
		// the LPAs are expected to have an id, but the type from the database is not guaranteed to have it
		...LPAs.filter((t): t is typeof t & { id: string } => Boolean(t.id))
			.map((t) => ({ text: t.name, value: t.id }))
			.sort((a, b) => a.text.localeCompare(b.text))
	];
};

interface FormattingContext {
	getQuestion: (fieldName: string) => Question | undefined;
	mockJourney: any;
}

/**
 * Formats the output of the Originator column, which could be
 * an inspector, officer or secretary of state, and depending on
 * answer will show a slightly different display.
 */
export const handleOriginatorFormattingFn = (
	typeValue: string,
	row: Record<string, unknown>,
	{ getQuestion, mockJourney }: FormattingContext
): string => {
	const getFormattedName = (role: string, fieldName: string): string => {
		const question = getQuestion(fieldName);

		if (question && row[fieldName]) {
			const formatted = question.formatAnswerForSummary('', mockJourney, row[fieldName]);
			return `${role}<br>${formatted[0]?.value || ''}`;
		}

		return role;
	};

	switch (typeValue) {
		case DECISION_MAKER_TYPE_ID.OFFICER:
			return getFormattedName('Officer', 'decisionMakerOfficerId');

		case DECISION_MAKER_TYPE_ID.INSPECTOR:
			return getFormattedName('Inspector', 'decisionMakerInspectorId');

		case DECISION_MAKER_TYPE_ID.SECRETARY_OF_STATE:
			return 'Secretary of State';

		default:
			return '-';
	}
};

interface DateQuestionProps {
	fieldName: string;
	title?: string;
	hint?: string;
	editable?: boolean;
	viewData?: Record<string, unknown>;
	question?: string;
	url?: string;
	isDateTime?: boolean;
	/**
	 * When true, the date is optional: if none of the day/month/year fields
	 * are filled in the DateValidator checks are skipped entirely.
	 */
	optional?: boolean;
	/**
	 * Additional validators to merge with DateValidator.
	 */
	validators?: BaseValidator[];
}

export function dateQuestion({
	fieldName,
	title,
	hint = 'For example, 27 3 2007',
	editable = true,
	viewData = {},
	question,
	url,
	isDateTime = false,
	optional = false,
	validators = []
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
		validators: [new DateValidator(title, { optional }), ...validators],
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

/**
 * Merges the linked case and lead case status onto one line for each case
 */
export const linkedCaseSummaryFormatter = ({ answer, formattedAnswer, question }: SummaryFormatterContext) => {
	const rows = getLinkedCaseDetailRows(answer);

	if (!rows.length) {
		return formattedAnswer;
	}

	const { section, summaryLimit } = question as unknown as TableManageListQuestion;
	const referenceQuestion = section.questions.find((q: Question) => q.fieldName === 'linkedCaseId');

	const answers = rows.map((row) => {
		const referenceText = referenceQuestion ? referenceQuestion.formatAnswer(row.linkedCaseId) : row.linkedCaseId;

		const summaryLine = row.linkedCaseIsLead === BOOLEAN_OPTIONS.YES ? `${referenceText} (Lead)` : referenceText;

		return [{ answer: summaryLine }];
	});

	return nunjucks.render('custom-components/manage-list-table/answer-summary-list.njk', {
		answers,
		limit: summaryLimit,
		uniqueId: `list-${question.fieldName}`,
		enableToggle: answers.length > summaryLimit
	});
};

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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) => validateDateIsAfterReceivedDate(date, receivedDate, 'Start date')
			})
		]
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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Objection period end date')
			})
		]
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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date decision must be issued by / expiry date')
			})
		]
	}),
	partiesDecisionNotificationDeadlineDate: dateQuestion({
		fieldName: 'partiesDecisionNotificationDeadlineDate',
		title: 'Date to notify parties of decision date',
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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date to notify parties of decision')
			})
		]
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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Target decision date')
			})
		]
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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date proposed modifications advertised')
			})
		]
	})
} satisfies Record<string, MpescQuestionProps>;

export const DOCUMENTS_QUESTIONS = {
	filesLocation: {
		type: COMPONENT_TYPES.TEXT_ENTRY,
		title: 'Offline document location',
		question: 'Where are the paper documents relating to the case stored?',
		fieldName: 'filesLocation',
		url: 'offline-document-location',
		hint: 'e.g. Sealed orders, paper letters',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: 'Offline document location must be 250 characters or less'
				}
			})
		]
	},
	relevantWebsiteLinks: {
		type: COMPONENT_TYPES.TEXT_ENTRY,
		title: 'Relevant website links',
		question: 'What are the relevant website links?',
		fieldName: 'relevantWebsiteLinks',
		url: 'relevant-website-links',
		hint: 'e.g. third party website for deposited documents',
		validators: [
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: 'Relevant website links must be 250 characters or less'
				}
			})
		]
	}
} satisfies Record<string, MpescQuestionProps>;

export const COSTS_QUESTIONS = {
	rechargeable: {
		type: CUSTOM_COMPONENTS.BOOLEAN_WITH_EXTRA_ACTIONS, // TODO: move into dynamic forms
		title: 'Rechargeable',
		question: 'Is this a rechargeable case?',
		fieldName: 'rechargeable',
		url: 'rechargeable',
		validators: [new RequiredValidator('Select yes if this is a rechargeable case')],
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'rechargeable/remove'
				}
			]
		}
	},
	finalCost: {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT, // TODO: update to single line input once that has been updated to have prefixes in dynamic forms
		title: 'Final cost',
		question: 'What was the final cost?',
		fieldName: 'finalCost',
		url: 'final-cost',
		inputFields: [
			// @ts-expect-error - TODO: update to single line input once that has been updated to have prefixes in dynamic forms
			{
				fieldName: 'finalCost',
				prefix: { text: '£' },
				formatPrefix: '£'
			}
		],
		validators: [
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
		type: CUSTOM_COMPONENTS.BOOLEAN_WITH_EXTRA_ACTIONS,
		title: 'Fee received',
		question: 'Has the fee been received?',
		fieldName: 'feeReceived',
		url: 'fee-received',
		validators: [new RequiredValidator('Select yes if the fee has been received')],
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'fee-received/remove'
				}
			]
		}
	},
	invoiceSent: {
		type: COMPONENT_TYPES.RADIO, // Radio because it's Yes, No, Interim - so cannot be Bool
		title: 'Invoice sent',
		question: 'Has the invoice been sent?',
		fieldName: 'invoiceSent',
		url: 'invoice-sent',
		validators: [new RequiredValidator('Select yes if the invoice has been sent')],
		options: INVOICE_STATUSES.map((status) => ({ text: status.displayName, value: status.id })),
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'invoice-sent/remove'
				}
			]
		}
	}
} satisfies Record<string, MpescQuestionProps>;

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
	historicalReference: {
		type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
		title: 'Historical reference',
		question: 'not editable',
		fieldName: 'historicalReference',
		url: '',
		editable: false
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
		validators: [new RequiredValidator('Select a case status')],
		options: CASE_STATUSES.map((status) => ({ text: status.displayName, value: status.id }))
	},
	abeyancePeriod: {
		type: CUSTOM_COMPONENTS.DATE_PERIOD_WITH_EXTRA_ACTIONS, // TODO: move into dynamic forms
		title: 'Abeyance period',
		question: 'What is the abeyance period?',
		fieldName: 'abeyancePeriod',
		url: 'abeyance-period',
		dateFormat: 'd MMMM yyyy',
		validators: [
			new CustomDatePeriodValidator(
				'abeyance period',
				{ ensureFuture: false, ensurePast: false },
				{ ensureFuture: false, ensurePast: false },
				true, // endDateAfterStartDate
				true, // endOptional
				'Abeyance start date must be before the abeyance end date' // error message
			),
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (abeyancePeriod, receivedDate) =>
					validateDateRangeIsAfterReceivedDate(abeyancePeriod, receivedDate, 'Abeyance')
			})
		],
		labels: { start: 'Start', end: 'End' },
		hintStart: 'For example, 27 3 2007',
		hintEnd: 'For example, 27 3 2007',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'abeyance-period/remove'
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
		validators: [new RequiredValidator('Select the round of advertised modifications')],
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
		type: COMPONENT_TYPES.SELECT,
		title: 'Authority (LPA, OMA, CRA)',
		question: 'Who is the authority?',
		hint: 'Enter the Local Planning Authority or Common Registration Authority (optional)',
		fieldName: 'authorityId',
		url: 'authority',
		options: getAuthorityOptions(),
		validators: [new RequiredValidator('Select an authority')],
		viewFolder: 'custom-components/select-authority',
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'authority/remove'
				}
			]
		}
	},
	priority: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Priority',
		question: 'What is the priority?',
		fieldName: 'priorityId',
		url: 'priority',
		validators: [new RequiredValidator('Select a priority')],
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
	},
	applicantDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Applicant or appellant',
		question: 'Check applicant or appellant details',
		fieldName: 'applicantDetails',
		url: 'applicant-details',
		viewData: {
			emptyName: 'applicant or appellant',
			emptyNamePlural: 'applicants or appellants',
			hideBackLink: true
		},
		titleSingular: 'applicant or appellant',
		showAnswersInSummary: true,
		hideRemoveOnLastItem: true
	},
	...createPersonQuestions({
		section: 'applicant',
		db: 'applicant',
		url: 'applicant',
		label: 'Applicant or appellant',
		hintPrefix: 'Enter the name of the main party. This could also be a server.',
		orgNameLabel: 'Joint applicants/appellants or company name',
		viewData: {
			continueButtonText: 'Continue'
		}
	})
} satisfies Record<string, MpescQuestionProps>;

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
		type: CUSTOM_COMPONENTS.LEGACY_RADIO,
		title: 'Subtype',
		question: 'not editable',
		fieldName: 'subTypeId',
		url: '',
		validators: [],
		editable: false,
		options: CASE_SUBTYPES.map((type) => ({ text: type.displayName, value: type.id })),
		// populated in createOverviewQuestions
		legacyOptions: []
	},
	act: {
		type: CUSTOM_COMPONENTS.LEGACY_SELECT,
		title: 'Act',
		question: 'What is the relevant legislation or act for this case?',
		fieldName: 'act',
		url: 'act',
		validators: [new RequiredValidator('Select a legislation/act')],
		options: [{ text: '', value: '' }, ...ACT_SECTIONS.map((type) => ({ text: type.displayName, value: type.id }))],
		legacyOptions: LEGACY_ACT_SECTIONS.map((act) => ({ text: act.displayName, value: act.id })),
		viewData: {
			extraActionButtons: [
				{
					text: 'Remove and save',
					type: 'submit',
					formaction: 'act/remove'
				}
			]
		}
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
	relatedCaseDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Related case(s)',
		question: 'Check related case details',
		fieldName: 'relatedCaseDetails',
		url: 'check-related-cases',
		showAnswersInSummary: true,
		viewData: {
			emptyName: 'related case',
			hideBackLink: true
		},
		titleSingular: 'related case'
	},
	addRelatedCase: {
		type: COMPONENT_TYPES.MULTI_FIELD_INPUT, // Multi because we want an H1 header and an inline question too.
		title: 'Add related case details',
		question: 'Add related case details',
		fieldName: 'addRelatedCase',
		url: 'add-related-cases',
		inputFields: [{ fieldName: 'relatedCaseReference', label: 'Related case reference' }],
		viewData: {
			tableHeader: 'Related case reference',
			continueButtonText: 'Continue'
		},
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
		viewData: {
			emptyName: 'linked case',
			hideBackLink: true
		},
		titleSingular: 'linked case',
		validators: [
			new ManageListItemsCompleteValidator({
				linkedCaseIsLead: 'whether the case is the lead case'
			}),
			new ManageListItemsValidator({
				validationFunction: (linkedCaseDetails) => validateOnlyOneLeadLinkedCase(linkedCaseDetails)
			})
		],
		formatSummaryValue: linkedCaseSummaryFormatter
	},
	linkedCaseId: {
		type: COMPONENT_TYPES.SELECT,
		title: 'Add linked case details',
		question: 'Add linked case details',
		fieldName: 'linkedCaseId',
		url: 'linked-case-reference',
		viewData: {
			tableHeader: 'Linked case reference',
			continueButtonText: 'Continue'
		},
		options: [
			// options populated dynamically in createOverviewQuestions with other case references
		],
		validators: [
			new RequiredValidator('Select the linked case reference'),
			new ManageListCrossFieldValidator({
				dependencyFieldName: 'linkedCaseDetails',
				validationFunction: (linkedCaseId, linkedCaseDetails) =>
					validateUniqueLinkedCaseId(linkedCaseId, linkedCaseDetails)
			})
		]
	},
	isLead: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Is this the lead case?',
		question: 'Is this the lead case?',
		fieldName: 'linkedCaseIsLead',
		url: 'is-lead',
		viewData: {
			tableHeader: 'Lead?',
			continueButtonText: 'Continue'
		},
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
} satisfies Record<string, MpescQuestionProps>;

export const TEAM_QUESTIONS = {
	caseOfficer: {
		type: CUSTOM_COMPONENTS.LEGACY_SELECT,
		title: 'Case officer',
		question: 'Who is the assigned case officer?',
		fieldName: 'caseOfficerId',
		url: 'case-officer',
		validators: [new RequiredValidator('Select a case officer')],
		// will be populated dynamically based on the entra group members passed in
		options: [],
		legacyOptions: []
	},
	inspectorDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Inspector(s)',
		question: 'Check inspector details',
		fieldName: 'inspectorDetails',
		url: INSPECTOR_CONSTANTS.INSPECTOR_URL,
		showAnswersInSummary: true,
		viewData: {
			emptyName: 'inspector',
			hideBackLink: true
		},
		titleSingular: 'inspector',
		validators: [
			new ManageListItemsCompleteValidator({
				inspectorId: 'Inspector name',
				inspectorAllocatedDate: 'Date appointed'
			})
		]
	},
	inspector: {
		type: CUSTOM_COMPONENTS.LEGACY_SELECT,
		title: 'Inspector',
		question: 'Who is the inspector?',
		fieldName: 'inspectorId',
		url: 'inspector',
		validators: [new RequiredValidator('Select an inspector')],
		viewData: {
			tableHeader: 'Inspector name',
			continueButtonText: 'Continue'
		},
		// will be populated dynamically based on the entra group members passed in
		options: [],
		legacyOptions: []
	},
	inspectorAllocatedDate: dateQuestion({
		fieldName: 'inspectorAllocatedDate',
		title: 'Inspector allocated date',
		question: 'What date was the inspector appointed?',
		url: 'inspector-allocated-date',
		viewData: {
			tableHeader: 'Date appointed',
			continueButtonText: 'Continue'
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date inspector appointed')
			})
		]
	})
} satisfies Record<string, MpescQuestionProps>;

/**
 * Creates a team questions object, with the extra dynamic options for caseOfficers
 * added, based on the entra group members passed in.
 */
export function createTeamQuestions(
	teamQuestions: typeof TEAM_QUESTIONS,
	groupMembers: EntraGroupMembers,
	userMap: UserMap
) {
	const caseOfficers = groupMembers.caseOfficers.map(referenceDataToRadioOptions);
	caseOfficers.unshift({ text: '', value: '' });

	const inspectors = groupMembers.inspectors.map(referenceDataToRadioOptions);
	inspectors.unshift({ text: '', value: '' });

	const legacyOptions = getAndSortLegacyUsers(userMap);

	return {
		...teamQuestions,
		caseOfficer: {
			...teamQuestions.caseOfficer,
			options: caseOfficers,
			legacyOptions
		},
		inspector: {
			...teamQuestions.inspector,
			options: inspectors,
			legacyOptions
		}
	};
}

export const OUTCOME_QUESTIONS = {
	outcomeDetails: {
		type: CUSTOM_COMPONENTS.OUTCOMES_LIST,
		title: 'Type of decision or report',
		question: 'Check outcome details',
		fieldName: 'outcomeDetails',
		url: 'check-outcome-details',
		viewData: {
			emptyName: 'outcome',
			hideBackLink: true
		},
		titleSingular: 'outcome',
		columns: [
			{ header: 'Type', fieldName: 'decisionTypeId' },
			{
				header: 'Originator',
				fieldName: 'decisionMakerTypeId',
				format: handleOriginatorFormattingFn
			},
			{ header: 'Outcome', fieldName: 'outcomeId' },
			{ header: 'Outcome date', fieldName: 'outcomeDate' },
			{ header: 'Received date', fieldName: 'decisionReceivedDate' }
		],
		validators: [
			new ManageListItemsCompleteValidator({
				decisionTypeId: 'Decision type',
				decisionMakerTypeId: 'Originator',
				decisionMakerInspectorId: 'Inspector',
				decisionMakerOfficerId: 'Officer',
				outcomeId: 'Outcome',
				outcomeDate: 'Outcome date'
			})
		],
		showAnswersInSummary: true,
		summaryLimit: 3
	},
	decisionType: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Outcome type',
		question: 'What is the type of decision or report?',
		fieldName: 'decisionTypeId',
		url: 'type-of-decision',
		validators: [new RequiredValidator('Select a type of decision or report')],
		options: DECISION_TYPES.map((status) => ({ text: status.displayName, value: status.id })),
		viewData: {
			continueButtonText: 'Continue'
		}
	},
	decisionMakerType: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Decision maker',
		question: 'Who is the decision maker or report writer?',
		fieldName: 'decisionMakerTypeId',
		url: 'decision-maker-type',
		validators: [new RequiredValidator('Select the decision maker')],
		options: DECISION_MAKER_TYPES.map((status) => ({ text: status.displayName, value: status.id })),
		viewData: {
			continueButtonText: 'Continue'
		}
	},
	decisionMakerInspector: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Inspector',
		hint: 'If no inspectors are available, add them on the inspector page.',
		question: 'Who is the inspector?',
		fieldName: 'decisionMakerInspectorId',
		url: 'inspector-decision-maker',
		validators: [new RequiredValidator('Select the inspector')],
		viewData: {
			continueButtonText: 'Continue'
		},
		// will be populated dynamically based on the entra group members passed in
		options: []
	},
	decisionMakerOfficer: {
		type: COMPONENT_TYPES.SELECT,
		title: 'Officer',
		question: 'Who is the officer?',
		fieldName: 'decisionMakerOfficerId',
		url: 'officer-decision-maker',
		validators: [new RequiredValidator('Select the officer')],
		viewData: {
			continueButtonText: 'Continue'
		},
		// will be populated dynamically based on the entra group members passed in
		options: []
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

			if (status.id === OUTCOME_ID.OTHER) {
				option.conditional = {
					fieldName: 'otherComment',
					type: 'textarea'
				};
			}

			return option;
		}).toSpliced(-1, 0, { divider: 'or' }),
		viewData: {
			continueButtonText: 'Continue'
		}
	},
	outcomeDate: dateQuestion({
		fieldName: 'outcomeDate',
		title: 'Outcome date',
		question: 'What is the outcome date?',
		hint: 'Date of the decision, proposal, report or recommendation. For example 27 3 2007.',
		viewData: {
			continueButtonText: 'Continue'
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) => validateDateIsAfterReceivedDate(date, receivedDate, 'Outcome date')
			})
		]
	}),
	decisionReceivedDate: dateQuestion({
		fieldName: 'decisionReceivedDate',
		title: 'Outcome received date',
		question: 'When was the outcome received? (optional)',
		hint: 'Required if the decision was determined external to PINS. For example 27 3 2007.',
		optional: true,
		viewData: {
			continueButtonText: 'Continue'
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Outcome received date')
			})
		]
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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Parties notified of outcome')
			})
		]
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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Order decision dispatch')
			})
		]
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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Sealed order returned')
			})
		]
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
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Decision published')
			})
		]
	})
} satisfies Record<string, MpescQuestionProps>;

/**
 * Creates the Outcome questions, adding in the group members from
 * entra for decision makers.
 */
export function createOutcomeQuestions(
	outcomeQuestions: typeof OUTCOME_QUESTIONS,
	groupMembers: EntraGroupMembers,
	inspectors: Record<string, unknown>[]
) {
	const caseOfficerOptions = groupMembers.caseOfficers.map(referenceDataToRadioOptions);
	caseOfficerOptions.unshift({ text: '', value: '' });

	const inspectorIds = inspectors?.map((inspector) => inspector.inspectorId);

	const relevantInspectors = [...groupMembers.inspectors].filter((member) => inspectorIds.includes(member.id));
	const inspectorOptions = relevantInspectors.map(referenceDataToRadioOptions);

	return {
		...outcomeQuestions,
		decisionMakerOfficer: {
			...outcomeQuestions.decisionMakerOfficer,
			options: caseOfficerOptions
		},
		decisionMakerInspector: {
			...outcomeQuestions.decisionMakerInspector,
			options: inspectorOptions
		}
	};
}

/**
 * Generates the Overview questions, which are mostly the same
 * except for caseSubtype which needs a legacyOptions field appended
 * so that we can display user added values.
 */
export function createOverviewQuestions(
	overviewQuestions: typeof OVERVIEW_QUESTIONS,
	answers: Record<string, unknown>,
	otherCases: OtherCaseWithParent[] = []
) {
	const subType = answers.SubType as { displayName: string; id: string };

	const subTypes = subType
		? [
				{
					text: `Other: ${subType.displayName}`,
					value: subType.id
				}
			]
		: [];

	const linkedCaseOptions = [
		{ text: '', value: '' }, // ensure there is a 'null' option so the first case isn't selected by default
		...otherCases.map((otherCase) => ({
			text: otherCase.reference,
			value: otherCase.id
		}))
	];

	const currentCaseId = answers.id as string;
	const existingLeadCaseMap = buildExistingLeadCaseMap(otherCases);

	// The current case's own pre-existing group lead, derived from its already-saved
	// `linkedCaseDetails` (populated from the DB): the lead row's `linkedCaseId` if one
	// of its existing linked cases is marked lead, otherwise the current case is already
	// the lead of its own group (or unlinked), so it's its own lead.
	const originalLinkedCaseRows = getLinkedCaseDetailRows(answers.linkedCaseDetails);
	const originalLeadRow = originalLinkedCaseRows.find((row) => row.linkedCaseIsLead === BOOLEAN_OPTIONS.YES);
	const currentCaseExistingLeadCaseId = originalLeadRow ? originalLeadRow.linkedCaseId : currentCaseId;

	return {
		...overviewQuestions,
		caseSubtype: {
			...overviewQuestions.caseSubtype,
			legacyOptions: subTypes
		},
		linkedCaseId: {
			...overviewQuestions.linkedCaseId,
			options: linkedCaseOptions
		},
		isLead: {
			...overviewQuestions.isLead,
			validators: [
				...overviewQuestions.isLead.validators,
				new ManageListCrossFieldValidator({
					dependencyFieldName: 'linkedCaseDetails',
					validationFunction: (isLead, linkedCaseDetails, currentItem) =>
						validateLeadCaseNotAlreadyLinked(
							isLead,
							linkedCaseDetails,
							currentItem as { linkedCaseId?: string } | undefined,
							existingLeadCaseMap,
							currentCaseId,
							currentCaseExistingLeadCaseId
						)
				})
			]
		}
	};
}

export const KEY_CONTACTS_QUESTIONS = {
	objectorDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Objector(s)',
		question: 'Check objector details',
		fieldName: 'objectorDetails',
		url: 'objector-details',
		viewData: {
			emptyName: 'objector',
			hideBackLink: true
		},
		titleSingular: 'objector',
		validators: [
			new ManageListItemsCompleteValidator({
				'objectorFirstName|objectorLastName|objectorOrgName':
					'at least one of First name, Last name or Company or organisation name',
				objectorStatusId: 'Objector status'
			})
		]
	},
	...createPersonQuestions({
		section: 'objector',
		db: 'objector',
		url: 'objector',
		label: 'Objector',
		orgNameLabel: 'Joint objectors or company name',
		viewData: {
			continueButtonText: 'Continue'
		}
	}),
	objectorStatus: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Objector status',
		question: 'What is the objector status?',
		fieldName: 'objectorStatusId',
		url: 'objector-status',
		validators: [new RequiredValidator("Select the status of the objector, or 'Not applicable'")],
		options: OBJECTOR_STATUSES_FORMATTED_WITH_DIVIDER,
		viewData: {
			tableHeader: 'Status',
			continueButtonText: 'Continue'
		}
	},
	contactDetails: {
		type: CUSTOM_COMPONENTS.TABLE_MANAGE_LIST,
		title: 'Contact(s)',
		question: 'Check contact details',
		fieldName: 'contactDetails',
		url: 'contact-details',
		viewData: {
			emptyName: 'contact',
			hideBackLink: true
		},
		titleSingular: 'contact',
		validators: [
			new ManageListItemsCompleteValidator({
				'contactFirstName|contactLastName|contactOrgName':
					'at least one of First name, Last name or Company or organisation name'
			})
		]
	},
	contactType: {
		type: CUSTOM_COMPONENTS.LEGACY_RADIO,
		title: 'Contact type',
		question: 'What is your contact type?',
		fieldName: 'contactTypeId',
		url: 'contact-type',
		validators: [new RequiredValidator('Select contact type')],
		options: CONTACT_TYPES.filter(
			(type) => type.id !== CONTACT_TYPE_ID.OBJECTOR && type.id !== CONTACT_TYPE_ID.APPLICANT_APPELLANT
		).map((type) => ({
			text: type.displayName,
			value: type.id
		})),
		viewData: {
			tableHeader: 'Contact type',
			continueButtonText: 'Continue'
		},
		legacyOptions: LEGACY_CONTACT_TYPES.map((legacyContactType) => ({
			text: legacyContactType.displayName,
			value: legacyContactType.id
		}))
	},
	...createPersonQuestions({
		section: 'contact',
		db: 'contact',
		url: 'contact',
		label: 'Contact',
		orgNameLabel: 'Joint contacts or company name',
		viewData: {
			continueButtonText: 'Continue'
		}
	})
} satisfies Record<string, MpescQuestionProps>;

/**
 * The manage list "check procedure details" table question.
 *
 * This is the equivalent of outcomeDetails — it renders the table on the
 * "Check procedure details" page showing all added procedures.
 *
 * The columns define what's shown in the summary table:
 * - Type (with special formatting for Admin/Site Visit subtypes)
 * - Inspector
 * - Status
 */
export const PROCEDURE_MANAGE_LIST_QUESTION = {
	procedureDetails: {
		type: CUSTOM_COMPONENTS.DEFINED_COLUMNS_LIST,
		title: 'Procedure(s)',
		question: 'Check procedure details',
		fieldName: 'procedureDetails',
		url: 'check-procedure-details',
		viewData: {
			emptyName: 'procedure',
			emptyNamePlural: 'procedures',
			warningText:
				'Changing the procedure type will delete the information ' +
				'you have already entered for an existing procedure.',
			hideBackLink: true
		},
		titleSingular: 'procedure',
		columns: [
			{
				header: 'Type',
				fieldName: 'procedureTypeId',
				/**
				 * Special formatting for the Type column:
				 * - Admin shows "Admin (In house) - <admin type>"
				 * - Site visit shows "Site visit - <site visit type>"
				 * - Others just show the procedure type name
				 */
				format: (typeValue: string, row: Record<string, unknown>): string => {
					const procedureType = PROCEDURES.find((p) => p.id === typeValue);
					const typeName = procedureType?.displayName || typeValue;

					if (typeValue === PROCEDURES_ID.ADMIN_IN_HOUSE && row.adminProcedureType) {
						const adminType = ADMIN_PROCEDURES.find((a) => a.id === row.adminProcedureType);
						return adminType ? `${typeName} - ${adminType.displayName}` : typeName;
					}

					if (typeValue === PROCEDURES_ID.SITE_VISIT && row.siteVisitTypeId) {
						const siteVisitType = SITE_VISITS.find((s) => s.id === row.siteVisitTypeId);
						return siteVisitType ? `${typeName} - ${siteVisitType.displayName}` : typeName;
					}

					return typeName;
				}
			},
			{
				header: 'Inspector',
				fieldName: 'inspectorId',
				format: (
					value: string,
					row: Record<string, unknown>,
					{ getQuestion, mockJourney }: FormattingContext
				): string => {
					if (
						row.procedureTypeId === PROCEDURES_ID.ADMIN_IN_HOUSE &&
						row.adminProcedureType === ADMIN_PROCEDURES_ID.CASE_OFFICER
					) {
						return GENERAL_CONSTANTS.NOT_APPLICABLE;
					}

					if (value === PROCEDURE_CONSTANTS.NOT_ALLOCATED) {
						return PROCEDURE_CONSTANTS.NOT_ALLOCATED_DISPLAY;
					}

					// Grab the relevant question and attempt to format it
					const question = getQuestion('inspectorId');
					if (question && row['inspectorId']) {
						const formatted = question.formatAnswerForSummary('', mockJourney, row['inspectorId']);
						return `${formatted[0]?.value}`;
					}

					return value || '—';
				}
			},
			{
				header: 'Status',
				fieldName: 'procedureStatusId'
			}
		],
		validators: [
			new ManageListItemsCompleteValidator({
				procedureTypeId: 'Procedure type',
				procedureStatusId: 'Procedure status'
			})
		],
		showAnswersInSummary: true,
		summaryLimit: 3
	}
} satisfies Record<string, MpescQuestionProps>;

// All questions, exported for testing.
export const ALL_QUESTIONS = {
	...DATE_QUESTIONS,
	...DOCUMENTS_QUESTIONS,
	...COSTS_QUESTIONS,
	...CASE_DETAILS_QUESTIONS,
	...TEAM_QUESTIONS,
	...OVERVIEW_QUESTIONS,
	...OUTCOME_QUESTIONS,
	...PROCEDURE_MANAGE_LIST_QUESTION,
	...KEY_CONTACTS_QUESTIONS
};

const FIELD_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
	Object.values(ALL_QUESTIONS).map((q: any) => [q.fieldName, q.title])
);

/**
 * Converts raw field names from answers into their human-readable
 * display names from the questions config.
 */
export function getFieldDisplayNames(fieldNames: string[]): string {
	return fieldNames.map((field) => FIELD_DISPLAY_NAMES[field] ?? field).join(', ');
}

/**
 * Takes a userMap and creates a sorted array of users
 * and prepends an empty option for legacy radio questions that require it.
 */
export function getAndSortLegacyUsers(userMap: UserMap) {
	return [
		{ text: '', value: '' },
		...[...userMap.entries()]
			.sort((a, b) => a[1].localeCompare(b[1]))
			.map(([idpUserId, displayName]) => ({
				text: displayName || idpUserId,
				value: idpUserId
			}))
	];
}

export function validateDateRangeIsAfterReceivedDate(datePeriod: unknown, receivedDate: unknown, label: string) {
	// Don't validate against received date if it doesn't exist
	if (!receivedDate || !(receivedDate instanceof Date)) {
		return true;
	}

	if (!datePeriod || typeof datePeriod !== 'object') {
		throw new Error(`${label} period not found`);
	}

	if (!('start' in datePeriod) || !(datePeriod.start instanceof Date)) {
		throw new Error(`${label} start date not found`);
	}

	if (!('end' in datePeriod) || !(datePeriod.end instanceof Date)) {
		throw new Error(`${label} end date not found`);
	}

	if (datePeriod.start < receivedDate) {
		throw new Error(`${label} start date cannot be before case received date`);
	}

	if (datePeriod.end < receivedDate) {
		throw new Error(`${label} end date cannot be before case received date`);
	}

	return true;
}

export function validateDateIsAfterReceivedDate(date: unknown, receivedDate: unknown, label: string) {
	// Don't validate against received date if it doesn't exist
	if (!receivedDate || !(receivedDate instanceof Date)) {
		return true;
	}

	if (!date || !(date instanceof Date)) {
		throw new Error(`${label} not found`);
	}

	if (date < receivedDate) {
		throw new Error(`${label} cannot be before case received date`);
	}

	return true;
}

export function validateOnlyOneLeadLinkedCase(linkedCaseDetails: unknown) {
	if (!Array.isArray(linkedCaseDetails)) {
		return true;
	}

	const leadCases = linkedCaseDetails.filter((caseDetail) => caseDetail?.linkedCaseIsLead === BOOLEAN_OPTIONS.YES);

	if (leadCases.length > 1) {
		throw new Error('You cannot save with more than 1 lead case');
	}

	return true;
}

export function validateUniqueLinkedCaseId(linkedCaseId: unknown, linkedCaseDetails: unknown) {
	const hasLinkedCases = Array.isArray(linkedCaseDetails) && linkedCaseDetails.length > 0;
	if (!hasLinkedCases || !linkedCaseId) {
		return true;
	}

	// linkedCaseDetails has already been filtered to exclude the row currently being edited
	const duplicateLinkedCase = linkedCaseDetails.some((caseDetail) => caseDetail.linkedCaseId === linkedCaseId);

	if (duplicateLinkedCase) {
		throw new Error('This case has already been added as a linked case.');
	}

	return true;
}

/**
 * Blocks a submitted set of `linkedCaseDetails` rows from changing the lead case of an
 * existing relationship, *except* when the change is just reassigning the lead within a
 * group the current case is already part of.
 *
 * Resolves the intended lead for the whole set, then checks every row's `linkedCaseId`
 * against `existingLeadCaseMap`: if any of them already has (or is) an existing lead
 * case different from the intended one, and that existing lead isn't the group the
 * current case already belongs to (`currentCaseExistingLeadCaseId`), this change would
 * silently pull that case out of its own group and into a different one, so it's
 * rejected.
 */
export function validateLeadCaseNotAlreadyLinked(
	isLead: unknown,
	linkedCaseDetails: unknown,
	currentItem: { linkedCaseId?: string } | undefined,
	existingLeadCaseMap: Map<string, string>,
	currentCaseId: string,
	currentCaseExistingLeadCaseId: string
) {
	const otherRows = getLinkedCaseDetailRows(linkedCaseDetails);
	const normalisedIsLead = isLead === BOOLEAN_OPTIONS.YES ? BOOLEAN_OPTIONS.YES : BOOLEAN_OPTIONS.NO;
	const currentRow = currentItem?.linkedCaseId
		? [{ linkedCaseId: currentItem.linkedCaseId, linkedCaseIsLead: normalisedIsLead }]
		: [];
	const allRows = [...otherRows, ...currentRow];

	const leadRow = allRows.find((row) => row.linkedCaseIsLead === BOOLEAN_OPTIONS.YES);
	const intendedLeadCaseId = leadRow ? leadRow.linkedCaseId : currentCaseId;

	for (const row of allRows) {
		const existingLeadCaseId = existingLeadCaseMap.get(row.linkedCaseId);

		if (
			existingLeadCaseId &&
			existingLeadCaseId !== intendedLeadCaseId &&
			existingLeadCaseId !== currentCaseId &&
			existingLeadCaseId !== currentCaseExistingLeadCaseId // So we can check across two groups of linked cases
		) {
			if (existingLeadCaseId === row.linkedCaseId) {
				throw new Error('This case is already a lead case to other cases');
			}

			throw new Error('This case is already linked to a different lead case');
		}
	}

	return true;
}
