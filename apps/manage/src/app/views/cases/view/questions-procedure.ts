import type { EntraGroupMembers } from '#util/entra-groups-types.ts';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/index.ts';
import {
	ADMIN_PROCEDURES,
	INQUIRY_OR_CONFERENCES,
	PROCEDURE_EVENT_FORMATS,
	PROCEDURE_STATUSES,
	PROCEDURES,
	SITE_VISITS
} from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';
import { ALL_QUESTION_CLASSES, CUSTOM_COMPONENTS } from '@pins/peas-row-commons-lib/forms/custom-components/index.ts';
import type { MpescQuestions } from '@pins/peas-row-commons-lib/forms/custom-components/question-props.ts';
import {
	AddressValidator,
	COMPONENT_TYPES,
	createQuestions,
	CrossQuestionValidator,
	NumericValidator,
	RequiredValidator
} from '@planning-inspectorate/dynamic-forms';
import { referenceDataToRadioOptions } from '../create-a-case/questions-utils.ts';
import { dateQuestion, getAndSortLegacyUsers, validateDateIsAfterReceivedDate } from './question-utils.ts';
import type { UserMap } from './types.ts';

type RadioOption = { text: string; value: string } | { divider: string };

export type InspectorRadioConfig = {
	inspectorGroupMembers: EntraGroupMembers['inspectors'];
	selected?: Record<string, unknown>[];
	userDisplayNames: UserMap;
};

const textOverrides = {
	notStartedText: '-',
	continueButtonText: 'Save',
	changeActionText: 'Change',
	answerActionText: 'Add'
};

/**
 * Returns the questions for the create-procedure journey
 */
export function createProcedureQuestions(config: InspectorRadioConfig, editable = true) {
	const inspectorIds = config.selected?.map((inspector) => inspector.inspectorId) || [];
	const relevantInspectors = config.inspectorGroupMembers.filter((member) => inspectorIds.includes(member.id));
	const inspectorOptions: RadioOption[] = relevantInspectors.map(referenceDataToRadioOptions);
	const legacyInspectorOptions = getAndSortLegacyUsers(config.userDisplayNames);

	/**
	 * Add "Not allocated yet" as a fallback option, separated by a divider.
	 */
	if (inspectorOptions.length > 0) {
		inspectorOptions.push({ divider: 'or' });
	}

	inspectorOptions.push({
		text: PROCEDURE_CONSTANTS.NOT_ALLOCATED_DISPLAY,
		value: PROCEDURE_CONSTANTS.NOT_ALLOCATED
	});
	return {
		procedureType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Procedure type',
			question: 'Which procedure will be used?',
			fieldName: 'procedureTypeId',
			url: 'type-of-procedure',
			validators: [new RequiredValidator('Select a procedure')],
			options: PROCEDURES.map((status) => ({ text: status.displayName, value: status.id })),
			viewData: {
				continueButtonText: 'Continue'
			},
			editable
		},
		procedureAdminType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Admin procedure type',
			question: "Who is conducting the 'in house' procedure?",
			fieldName: 'adminProcedureType',
			url: 'admin-procedure-type',
			validators: [new RequiredValidator("Select an 'in house' admin procedure type")],
			options: ADMIN_PROCEDURES.map((status) => ({ text: status.displayName, value: status.id })),
			viewData: {
				continueButtonText: 'Continue'
			},
			editable
		},
		procedureSiteVisitType: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Type of site visit',
			question: 'Which type of site visit will be conducted?',
			fieldName: 'siteVisitTypeId',
			url: 'type-of-site-visit',
			validators: [new RequiredValidator('Select a site visit type')],
			options: SITE_VISITS.map((status) => ({ text: status.displayName, value: status.id })),
			viewData: {
				continueButtonText: 'Continue'
			},
			editable
		},
		procedureInspector: {
			type: CUSTOM_COMPONENTS.LEGACY_RADIO,
			title: 'Inspector',
			hint: 'If no inspectors are available, add them on the inspector page.',
			question: 'Who is the inspector?',
			fieldName: 'inspectorId',
			url: 'procedure-inspector',
			validators: [new RequiredValidator('Select an option')],
			viewData: {
				continueButtonText: 'Continue'
			},
			options: inspectorOptions,
			legacyOptions: legacyInspectorOptions,
			editable
		},
		procedureStatus: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Procedure status',
			question: 'What is the status of the procedure?',
			fieldName: 'procedureStatusId',
			url: 'status-of-procedure',
			validators: [new RequiredValidator('Select a status')],
			options: PROCEDURE_STATUSES.map((status) => ({ text: status.displayName, value: status.id })),
			viewData: {
				continueButtonText: 'Continue'
			},
			editable
		}
	} satisfies MpescQuestions;
}

export function getCreateProcedureQuestions(config: InspectorRadioConfig, editable?: boolean) {
	const qs = createProcedureQuestions(config, editable);
	return createQuestions(qs, ALL_QUESTION_CLASSES, {}, textOverrides);
}

export function getHearingQuestions() {
	return createQuestions(HEARING_PROCEDURE_QUESTIONS, ALL_QUESTION_CLASSES, {}, textOverrides);
}

export function getInquiryQuestions() {
	return createQuestions(INQUIRY_PROCEDURE_QUESTIONS, ALL_QUESTION_CLASSES, {}, textOverrides);
}

export function getAdminInHouseQuestions() {
	return createQuestions(ADMIN_IN_HOUSE_PROCEDURE_QUESTIONS, ALL_QUESTION_CLASSES, {}, textOverrides);
}

export function getWrittenRepsQuestions() {
	return createQuestions(WRITTEN_REPS_PROCEDURE_QUESTIONS, ALL_QUESTION_CLASSES, {}, textOverrides);
}

export function getSiteVisitQuestions() {
	return createQuestions(SITE_VISIT_PROCEDURE_QUESTIONS, ALL_QUESTION_CLASSES, {}, textOverrides);
}

/**
 * Common to all procedures
 */
const COMMON_PROCEDURE_QUESTIONS = {
	procedureSiteVisitDate: dateQuestion({
		fieldName: 'siteVisitDate',
		title: 'Site visit date',
		question: 'When is the site visit date? (optional)',
		url: 'site-visit-date',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'site-visit-date/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Site visit date')
			})
		]
	})
} satisfies MpescQuestions;

/**
 * Shared by all procedures except site visit
 */
const SHARED_PROCEDURE_QUESTIONS = {
	procedureCaseOfficerVerificationDate: dateQuestion({
		fieldName: 'caseOfficerVerificationDate',
		title: 'Case officer verification date',
		question: 'When did the case officer verify the documents? (optional)',
		hint: 'Have all the necessary Statements of Case, Written Reps procedures, Notices, Proof of Posting and Proofs of Evidence been received and have the statutory targets in terms of notifications have been complied with?',
		url: 'case-officer-verification-case',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'case-officer-verification-case/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Case officer verification date')
			})
		]
	})
} satisfies MpescQuestions;

const HEARING_AND_INQUIRY_PROCEDURE_QUESTIONS = {
	procedureProofsReceivedDate: dateQuestion({
		fieldName: 'proofsOfEvidenceReceivedDate',
		title: 'Proofs of evidence received',
		question: 'When were all the proofs of evidence received? (optional)',
		url: 'proofs-received-date',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'proofs-received-date/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Proofs of evidence received')
			})
		]
	}),
	procedureStatementsReceivedDate: dateQuestion({
		fieldName: 'statementsOfCaseReceivedDate',
		title: 'Statements of case received',
		question: 'When were all the statements of case received? (optional)',
		url: 'statements-received-date',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'statements-received-date/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Statements of case received')
			})
		]
	})
} satisfies MpescQuestions;

const CONFERENCE_PROCEDURE_QUESTIONS = {
	procedureCmcDate: dateQuestion({
		fieldName: 'conferenceDate',
		title: 'Case management conference date',
		question: 'When is the case management conference? (optional)',
		url: 'cmc-date',
		isDateTime: true,
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'cmc-date/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Case management conference date')
			})
		]
	}),
	procedureCmcFormat: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Case management conference type',
		question: 'What is the type of the case management conference?',
		fieldName: 'conferenceFormatId',
		url: 'case-management-conference-type',
		validators: [new RequiredValidator('Select the type of the case management conference')],
		options: PROCEDURE_EVENT_FORMATS.filter((f) => f.id !== 'hybrid').map((type) => ({
			text: type.displayName,
			value: type.id
		})),
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'case-management-conference-type/remove' }
			]
		}
	},
	procedureCmcVenue: {
		type: CUSTOM_COMPONENTS.ADDRESS_WITH_ID,
		title: 'Case management conference venue',
		question: 'Where is the case management conference?',
		fieldName: 'conferenceVenue',
		url: 'case-management-conference-venue',
		validators: [new AddressValidator()]
	},
	procedureCmcNoteSentDate: dateQuestion({
		fieldName: 'conferenceNoteSentDate',
		title: 'Case management conference note sent',
		question: 'When was the case management note sent? (optional)',
		url: 'case-management-conference-note-sent',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'case-management-conference-note-sent/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Case management conference note sent')
			})
		]
	})
} satisfies MpescQuestions;

/**
 * Questions for the hearing procedure/section
 */
const HEARING_PROCEDURE_QUESTIONS = {
	...COMMON_PROCEDURE_QUESTIONS,
	...SHARED_PROCEDURE_QUESTIONS,
	...CONFERENCE_PROCEDURE_QUESTIONS,
	...HEARING_AND_INQUIRY_PROCEDURE_QUESTIONS,
	procedureHearingTargetDate: dateQuestion({
		fieldName: 'hearingTargetDate',
		title: 'Target hearing date',
		question: 'When is the target hearing date? (optional)',
		url: 'target-hearing-date',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'target-hearing-date/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Target hearing date')
			})
		]
	}),
	procedurePartiesNotifiedOfHearingDate: dateQuestion({
		fieldName: 'partiesNotifiedOfHearingDate',
		title: 'Date parties must be notified of hearing',
		question: 'When must parties be notified of the hearing? (optional)',
		url: 'party-notified-hearing-date',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'party-notified-hearing-date/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date parties must be notified of hearing')
			})
		]
	}),
	procedureEarliestHearingDate: dateQuestion({
		fieldName: 'earliestHearingDate',
		title: 'Earliest potential hearing date',
		question: 'When is the earliest possible hearing date? (optional)',
		url: 'earliest-potential-hearing-date',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'earliest-potential-hearing-date/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Earliest potential hearing date')
			})
		]
	}),
	procedureConfirmedHearingDate: dateQuestion({
		fieldName: 'confirmedHearingDate',
		title: 'Confirmed hearing date',
		question: 'What is the hearing date? (optional)',
		url: 'confirmed-hearing-date',
		isDateTime: true,
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'confirmed-hearing-date/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Confirmed hearing date')
			})
		]
	}),
	procedureHearingFormat: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Hearing type',
		question: 'What is the type of hearing?',
		fieldName: 'hearingFormatId',
		url: 'type-of-hearing',
		validators: [new RequiredValidator('Select type of hearing')],
		options: PROCEDURE_EVENT_FORMATS.map((type) => ({ text: type.displayName, value: type.id })),
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'type-of-hearing/remove' }]
		}
	},
	procedureHearingVenue: {
		type: CUSTOM_COMPONENTS.ADDRESS_WITH_ID,
		title: 'Hearing venue',
		question: 'Where is the hearing?',
		fieldName: 'hearingVenue',
		url: 'hearing-venue',
		validators: [new AddressValidator()]
	},
	procedureHearingDateNotificationDate: dateQuestion({
		fieldName: 'hearingDateNotificationDate',
		title: 'Date parties notified of hearing date',
		question: 'When were parties notified of the hearing date? (optional)',
		url: 'date-notified-of-hearing-date',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'date-notified-of-hearing-date/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date parties notified of hearing date')
			})
		]
	}),
	procedureHearingVenueNotificationDate: dateQuestion({
		fieldName: 'hearingVenueNotificationDate',
		title: 'Date parties notified of hearing venue',
		question: 'When were parties notified of the hearing venue? (optional)',
		url: 'date-notified-of-hearing-venue',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'date-notified-of-hearing-venue/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date parties notified of hearing venue')
			})
		]
	}),
	procedureHearingClosedDate: dateQuestion({
		fieldName: 'hearingClosedDate',
		title: 'Date hearing closed',
		question: 'When did the hearing close? (optional)',
		url: 'date-hearing-closed',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'date-hearing-closed/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date hearing closed')
			})
		]
	}),
	procedureHearingPreparationTime: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Preparation time (days)',
		question: 'How long is the hearing preparation time? (optional)',
		hint: 'For example, 0.5, 1',
		fieldName: 'hearingPreparationTimeDays',
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
	procedureHearingTravelTime: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Travel time (days)',
		question: 'How long is the hearing travel time? (optional)',
		hint: 'For example, 0.5, 1',
		fieldName: 'hearingTravelTimeDays',
		url: 'hearing-travel-time',
		suffix: 'days',
		validators: [
			new NumericValidator({
				regex: /^$|^\d+(\.\d+)?$/,
				regexMessage: 'Hearing travel time must only contain numbers'
			})
		],
		viewData: { width: 5 }
	},
	procedureHearingSittingTime: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Sitting time (days)',
		question: 'How long is the hearing sitting time? (optional)',
		hint: 'For example, 0.5, 1',
		fieldName: 'hearingSittingTimeDays',
		url: 'hearing-sitting-time',
		suffix: 'days',
		validators: [
			new NumericValidator({
				regex: /^$|^\d+(\.\d+)?$/,
				regexMessage: 'Hearing sitting time must only contain numbers'
			})
		],
		viewData: { width: 5 }
	},
	procedureHearingReportingTime: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Reporting time (days)',
		question: 'How long is the hearing reporting time? (optional)',
		hint: 'For example, 0.5, 1',
		fieldName: 'hearingReportingTimeDays',
		url: 'hearing-reporting-time',
		suffix: 'days',
		validators: [
			new NumericValidator({
				regex: /^$|^\d+(\.\d+)?$/,
				regexMessage: 'Hearing reporting time must only contain numbers'
			})
		],
		viewData: { width: 5 }
	}
} satisfies MpescQuestions;

/**
 * Questions for the inquiry procedure/section
 */
const INQUIRY_PROCEDURE_QUESTIONS = {
	...COMMON_PROCEDURE_QUESTIONS,
	...CONFERENCE_PROCEDURE_QUESTIONS,
	...HEARING_AND_INQUIRY_PROCEDURE_QUESTIONS,
	...SHARED_PROCEDURE_QUESTIONS,
	procedureInquiryTargetDate: dateQuestion({
		fieldName: 'inquiryTargetDate',
		title: 'Inquiry target date',
		question: 'When is the target inquiry date? (optional)',
		url: 'target-inquiry-date',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'target-inquiry-date/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Inquiry target date')
			})
		]
	}),
	procedurePartiesNotifiedOfInquiryDate: dateQuestion({
		fieldName: 'partiesNotifiedOfInquiryDate',
		title: 'Date parties must be notified of inquiry',
		question: 'When must parties be notified of the inquiry? (optional)',
		url: 'party-notified-inquiry-date',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'party-notified-inquiry-date/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date parties must be notified of inquiry')
			})
		]
	}),
	procedureEarliestInquiryDate: dateQuestion({
		fieldName: 'earliestInquiryDate',
		title: 'Earliest potential inquiry date',
		question: 'When is the earliest possible inquiry date? (optional)',
		url: 'earliest-potential-inquiry-date',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'earliest-potential-inquiry-date/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Earliest potential inquiry date')
			})
		]
	}),
	procedureConfirmedInquiryDate: dateQuestion({
		fieldName: 'confirmedInquiryDate',
		title: 'Confirmed inquiry date',
		question: 'What is the inquiry date? (optional)',
		url: 'inquiry-date-confirmed',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'inquiry-date-confirmed/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Confirmed inquiry date')
			})
		]
	}),
	procedureInquiryFormat: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Inquiry type',
		question: 'What is the inquiry type?',
		fieldName: 'inquiryFormatId',
		url: 'inquiry-type',
		validators: [new RequiredValidator('Select the inquiry type')],
		options: PROCEDURE_EVENT_FORMATS.map((type) => ({ text: type.displayName, value: type.id })),
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'inquiry-type/remove' }]
		}
	},
	procedureInquiryVenue: {
		type: CUSTOM_COMPONENTS.ADDRESS_WITH_ID,
		title: 'Inquiry venue',
		question: 'What is the inquiry venue?',
		fieldName: 'inquiryVenue',
		url: 'inquiry-venue',
		validators: [new AddressValidator()]
	},
	procedureInquiryDateNotificationDate: dateQuestion({
		fieldName: 'inquiryDateNotificationDate',
		title: 'Date parties notified of inquiry date',
		question: 'When were parties notified of the inquiry date? (optional)',
		url: 'date-notified-of-inquiry-date',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'date-notified-of-inquiry-date/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date parties notified of inquiry date')
			})
		]
	}),
	procedureInquiryVenueNotificationDate: dateQuestion({
		fieldName: 'inquiryVenueNotificationDate',
		title: 'Date parties notified of inquiry venue',
		question: 'When were parties notified of the inquiry venue? (optional)',
		url: 'date-notified-of-inquiry-venue',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'date-notified-of-inquiry-venue/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date parties notified of inquiry venue')
			})
		]
	}),
	procedureInquiryClosedDate: dateQuestion({
		fieldName: 'inquiryClosedDate',
		title: 'Date inquiry closed',
		question: 'When did the inquiry close? (optional)',
		url: 'date-inquiry-closed',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'date-inquiry-closed/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date inquiry closed')
			})
		]
	}),
	procedureInquiryPreparationTime: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Preparation time (days)',
		question: 'How long is the inquiry preparation time? (optional)',
		hint: 'For example, 0.5, 1',
		fieldName: 'inquiryPreparationTimeDays',
		url: 'inquiry-preparation-time',
		suffix: 'days',
		validators: [
			new NumericValidator({
				regex: /^$|^\d+(\.\d+)?$/,
				regexMessage: 'Inquiry preparation time must only contain numbers'
			})
		],
		viewData: { width: 5 }
	},
	procedureInquiryTravelTime: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Travel time (days)',
		question: 'How long is the inquiry travel time? (optional)',
		hint: 'For example, 0.5, 1',
		fieldName: 'inquiryTravelTimeDays',
		url: 'inquiry-travel-time',
		suffix: 'days',
		validators: [
			new NumericValidator({
				regex: /^$|^\d+(\.\d+)?$/,
				regexMessage: 'Inquiry travel time must only contain numbers'
			})
		],
		viewData: { width: 5 }
	},
	procedureInquirySittingTime: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Sitting time (days)',
		question: 'How long is the inquiry sitting time? (optional)',
		hint: 'For example, 0.5, 1',
		fieldName: 'inquirySittingTimeDays',
		url: 'inquiry-sitting-time',
		suffix: 'days',
		validators: [
			new NumericValidator({
				regex: /^$|^\d+(\.\d+)?$/,
				regexMessage: 'Inquiry sitting time must only contain numbers'
			})
		],
		viewData: { width: 5 }
	},
	procedureInquiryReportingTime: {
		type: COMPONENT_TYPES.NUMBER,
		title: 'Reporting time (days)',
		question: 'How long is the inquiry reporting time? (optional)',
		hint: 'For example, 0.5, 1',
		fieldName: 'inquiryReportingTimeDays',
		url: 'inquiry-reporting-time',
		suffix: 'days',
		validators: [
			new NumericValidator({
				regex: /^$|^\d+(\.\d+)?$/,
				regexMessage: 'Inquiry reporting time must only contain numbers'
			})
		],
		viewData: { width: 5 }
	},
	procedureInquiryOrConference: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Pre inquiry meeting or case management conference',
		question: 'Will there be a pre inquiry meeting or a case management conference?',
		fieldName: 'inquiryOrConferenceId',
		url: 'pim-or-cmc',
		validators: [
			new RequiredValidator('Select whether there will be a pre inquiry meeting or case management conference')
		],
		options: INQUIRY_OR_CONFERENCES.map((type) => ({ text: type.displayName, value: type.id })),
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'pim-or-cmc/remove' }]
		}
	},
	procedurePreInquiryMeetingDate: dateQuestion({
		fieldName: 'preInquiryMeetingDate',
		title: 'Pre inquiry meeting date',
		question: 'When is the pre inquiry meeting? (optional)',
		url: 'pre-inquiry-meeting-date',
		isDateTime: true,
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'pre-inquiry-meeting-date/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Pre inquiry meeting date')
			})
		]
	}),
	procedurePreInquiryFormat: {
		type: COMPONENT_TYPES.RADIO,
		title: 'Pre inquiry meeting format',
		question: 'What is the format of the pre inquiry meeting?',
		fieldName: 'preInquiryMeetingFormatId',
		url: 'pre-inquiry-type',
		validators: [new RequiredValidator('Select the format of the pre inquiry meeting')],
		options: PROCEDURE_EVENT_FORMATS.filter((f) => f.id !== 'hybrid').map((type) => ({
			text: type.displayName,
			value: type.id
		})),
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'pre-inquiry-type/remove' }]
		}
	},
	procedurePreInquiryNoteSent: dateQuestion({
		fieldName: 'preInquiryNoteSentDate',
		title: 'Pre inquiry meeting note sent',
		question: 'When was the pre inquiry meeting note sent? (optional)',
		url: 'pre-inquiry-note-sent',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'pre-inquiry-note-sent/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Pre inquiry meeting note sent')
			})
		]
	})
} satisfies MpescQuestions;

/**
 * Questions for the admin-in-house procedure/section
 */
const ADMIN_IN_HOUSE_PROCEDURE_QUESTIONS = {
	...COMMON_PROCEDURE_QUESTIONS,
	...SHARED_PROCEDURE_QUESTIONS,
	procedureInHouseDate: dateQuestion({
		fieldName: 'inHouseDate',
		title: 'In house date',
		question: 'When was Admin in house procedure done? (optional)',
		url: 'in-house-date',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'in-house-date/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) => validateDateIsAfterReceivedDate(date, receivedDate, 'In house date')
			})
		]
	})
} satisfies MpescQuestions;

/**
 * Questions for the written reps procedure/section
 */
const WRITTEN_REPS_PROCEDURE_QUESTIONS = {
	...COMMON_PROCEDURE_QUESTIONS,
	...SHARED_PROCEDURE_QUESTIONS,
	procedureOfferWrittenRepsDate: dateQuestion({
		fieldName: 'offerForWrittenRepresentationsDate',
		title: 'Date offer for written representations',
		question: 'When was the date offered for written representations? (optional)',
		url: 'date-offer-written-representations',
		optional: true,
		viewData: {
			extraActionButtons: [
				{ text: 'Remove and save', type: 'submit', formaction: 'date-offer-written-representations/remove' }
			]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Date offer for written representations')
			})
		]
	}),
	procedureDeadlineForConsent: dateQuestion({
		fieldName: 'deadlineForConsentDate',
		title: 'Deadline for consent',
		question: 'What is the deadline for consent? (optional)',
		hint: 'For example, 27 3 2007',
		url: 'deadline-consent',
		optional: true,
		viewData: {
			extraActionButtons: [{ text: 'Remove and save', type: 'submit', formaction: 'deadline-consent/remove' }]
		},
		validators: [
			new CrossQuestionValidator({
				dependencyFieldName: 'receivedDate',
				useBodyValuesForCurrent: true,
				validationFunction: (date, receivedDate) =>
					validateDateIsAfterReceivedDate(date, receivedDate, 'Deadline for consent')
			})
		]
	})
} satisfies MpescQuestions;

/**
 * Questions for the site visit procedure/section
 */
const SITE_VISIT_PROCEDURE_QUESTIONS = {
	...COMMON_PROCEDURE_QUESTIONS
} satisfies MpescQuestions;

/**
 * Fields that only apply to specific procedure types.
 *
 * Any field NOT listed here is considered "common" and will display
 * for all procedure types (e.g. siteVisitDate).
 */
const PROCEDURE_TYPE_FIELD_MAP: Record<string, string[]> = {
	/** Hearing-only fields */
	[PROCEDURES_ID.HEARING]: Object.values(HEARING_PROCEDURE_QUESTIONS).map((q) => q.fieldName),

	/** Inquiry-only fields */
	[PROCEDURES_ID.INQUIRY]: Object.values(INQUIRY_PROCEDURE_QUESTIONS).map((q) => q.fieldName),

	/** Admin-only fields */
	[PROCEDURES_ID.ADMIN_IN_HOUSE]: Object.values(ADMIN_IN_HOUSE_PROCEDURE_QUESTIONS).map((q) => q.fieldName),

	/** Written reps-only fields */
	[PROCEDURES_ID.WRITTEN_REPS]: Object.values(WRITTEN_REPS_PROCEDURE_QUESTIONS).map((q) => q.fieldName),

	/** Site visit has no extra fields beyond the common ones */
	[PROCEDURES_ID.SITE_VISIT]: Object.values(SITE_VISIT_PROCEDURE_QUESTIONS).map((q) => q.fieldName)
};

/**
 * Helper function that returns the list of unique fields for each procedure
 */
export function getUniqueProcedureFields(procedureTypeId: string): string[] {
	return PROCEDURE_TYPE_FIELD_MAP[procedureTypeId] || [];
}
