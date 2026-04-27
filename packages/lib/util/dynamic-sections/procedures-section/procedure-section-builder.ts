import { DynamicSectionBuilder } from '../dynamic-section-builder.ts';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { PROCEDURES } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { PROCEDURE_STATUSES } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/procedures.ts';

/**
 * Fields that are collected during the "add procedure" flow.
 *
 * These are shown in the summary section but are NOT editable from the
 * case details page — the user must go back through the manage list
 * "Change" link on the check procedure details page to edit them.
 */
const CREATE_FLOW_FIELDS = ['procedureTypeId', 'procedureStatusId', 'adminProcedureType', 'inspectorId'];

/**
 * Fields that only apply to specific procedure types.
 *
 * Any field NOT listed here is considered "common" and will display
 * for all procedure types (e.g. siteVisitDate).
 */
const PROCEDURE_TYPE_FIELD_MAP: Record<string, string[]> = {
	/** Hearing-only fields */
	[PROCEDURES_ID.HEARING]: [
		'hearingTargetDate',
		'partiesNotifiedOfHearingDate',
		'proofsOfEvidenceReceivedDate',
		'statementsOfCaseReceivedDate',
		'caseOfficerVerificationDate',
		'conferenceDate',
		'conferenceFormatId',
		'conferenceVenue',
		'conferenceNoteSentDate',
		'confirmedHearingDate',
		'hearingFormatId',
		'hearingVenue',
		'hearingDateNotificationDate',
		'hearingVenueNotificationDate',
		'earliestHearingDate',
		'hearingClosedDate',
		'hearingPreparationTimeDays',
		'hearingTravelTimeDays',
		'hearingSittingTimeDays',
		'hearingReportingTimeDays'
	],

	/** Inquiry-only fields */
	[PROCEDURES_ID.INQUIRY]: [
		'earliestInquiryDate',
		'inquiryTargetDate',
		'partiesNotifiedOfInquiryDate',
		'proofsOfEvidenceReceivedDate',
		'statementsOfCaseReceivedDate',
		'caseOfficerVerificationDate',
		'inquiryOrConferenceId',
		'preInquiryMeetingDate',
		'preInquiryMeetingFormatId',
		'preInquiryNoteSentDate',
		'conferenceDate',
		'conferenceFormatId',
		'conferenceVenue',
		'conferenceNoteSentDate',
		'confirmedInquiryDate',
		'inquiryFormatId',
		'inquiryVenue',
		'inquiryDateNotificationDate',
		'inquiryVenueNotificationDate',
		'inquiryClosedDate',
		'inquiryPreparationTimeDays',
		'inquiryTravelTimeDays',
		'inquirySittingTimeDays',
		'inquiryReportingTimeDays'
	],

	/** Admin-only fields */
	[PROCEDURES_ID.ADMIN_IN_HOUSE]: ['caseOfficerVerificationDate', 'inHouseDate'],

	/** Written reps-only fields */
	[PROCEDURES_ID.WRITTEN_REPS]: [
		'caseOfficerVerificationDate',
		'offerForWrittenRepresentationsDate',
		'deadlineForConsentDate'
	],

	/** Site visit has no extra fields beyond the common ones */
	[PROCEDURES_ID.SITE_VISIT]: []
};

/**
 * Dynamically generates sections for each Procedure on a case.
 
 * This extends DynamicSectionBuilder to customise how sections are
 * titled and which fields are shown.
 */
export class ProcedureSectionBuilder extends DynamicSectionBuilder {
	private readonly allTypeSpecificFields = new Set(Object.values(PROCEDURE_TYPE_FIELD_MAP).flat());

	constructor(manageListSection: Section) {
		super('procedureDetails', manageListSection);
	}

	/**
	 * Section heading: "<ProcedureType> (<Status>)"
	 * e.g. "Hearing (Active)", "Admin (In house) (Completed)"
	 *
	 * Falls back to "Procedure <n>" if type can't be resolved.
	 */
	protected override getSectionTitle(item: Record<string, unknown>, index: number): string {
		const procedureType = PROCEDURES.find((p) => p.id === item.procedureTypeId);
		const procedureStatus = PROCEDURE_STATUSES.find((s) => s.id === item.procedureStatusId);

		const typeName = procedureType?.displayName || `Procedure ${index + 1}`;
		const statusName = procedureStatus?.displayName;

		return statusName ? `${typeName} (${statusName})` : typeName;
	}

	/**
	 * Builds an individual procedure section.
	 *
	 * We use PROCEDURE_TYPE_FIELD_MAP to determine which fields
	 * are relevant for each procedure type, and filter accordingly.
	 */
	protected override buildSection(
		journeyResponse: JourneyResponse,
		item: Record<string, unknown>,
		index: number
	): Section {
		const sectionSegment = `procedure-${index + 1}`;
		const section = new Section(this.getSectionTitle(item, index), sectionSegment);

		const localResponse = this.createLocalResponse(journeyResponse, item);
		const procedureTypeId = item.procedureTypeId as string;

		const typeSpecificFields = PROCEDURE_TYPE_FIELD_MAP[procedureTypeId] || [];

		this.manageListSection.questions?.forEach((q: Question) => {
			if (!q.shouldDisplay(localResponse)) {
				return;
			}

			const isCreateFlowField = CREATE_FLOW_FIELDS.includes(q.fieldName);
			const isTypeSpecific = this.allTypeSpecificFields.has(q.fieldName);
			const isRelevantToThisType = typeSpecificFields.includes(q.fieldName);

			if (isTypeSpecific && !isRelevantToThisType) {
				return;
			}

			const clonedQuestion = this.cloneQuestion(q, index);

			/**
			 * siteVisitTypeId is a create-flow field for Site Visit procedures
			 * (selected during "add procedure"), but an editable detail field
			 * for other types like Hearing/Inquiry.
			 */
			const isSiteVisitTypeOnSiteVisit =
				q.fieldName === 'siteVisitTypeId' && procedureTypeId === PROCEDURES_ID.SITE_VISIT;

			if (isCreateFlowField || isSiteVisitTypeOnSiteVisit) {
				// Create-flow fields: shown but not editable from summary cards
				clonedQuestion.editable = false;
				clonedQuestion.url = '';
			} else {
				/**
				 * Detail fields: restore editability.
				 * The base cloneQuestion() sets editable=false and url='',
				 * but detail fields need to be editable with proper URLs.
				 *
				 * The URL uses the original question's url property (e.g. 'site-visit-date')
				 * which the dynamic forms routing resolves relative to the section.
				 */
				clonedQuestion.editable = true;
				clonedQuestion.url = q.url;
			}

			section.addQuestion(clonedQuestion);
		});

		return section;
	}

	/**
	 * Override cloneQuestion to handle two issues with the base Object.assign cloning:
	 *
	 * 1. Private class fields (#field) are bound to the original instance and cannot
	 *    be accessed via cloned objects — we shadow the getters with own-properties.
	 *
	 * 2. Detail field action links need correct URLs — the original formatAnswerForSummary
	 *    generates hrefs using the original fieldName, but cloned questions need URLs
	 *    based on the section segment and url slug.
	 */
	protected override cloneQuestion(question: Question, index: number): Question {
		const flatFieldName = this.getFlatFieldName(index, question.fieldName);

		// Use the original instance as prototype so all methods delegate naturally
		const cloned = Object.create(question) as Question;

		cloned.fieldName = flatFieldName;
		cloned.editable = false;
		cloned.url = '';
		cloned.shouldDisplay = () => true;

		// Shadow private-field-backed getters to avoid "Cannot read private member" errors.
		// These cloned questions are never manage list questions, so both default to false.
		Object.defineProperty(cloned, 'isInManageListSection', {
			get: () => false,
			set: () => {},
			configurable: true,
			enumerable: true
		});

		Object.defineProperty(cloned, 'isManageListQuestion', {
			get: () => false,
			configurable: true,
			enumerable: true
		});

		/**
		 * Delegate to the original instance (preserving private field access for
		 * subclasses like DateTimeQuestion), then patch action hrefs to use
		 * the correct section segment and url slug.
		 */
		cloned.formatAnswerForSummary = (
			sectionSegment: string,
			journey: Parameters<Question['formatAnswerForSummary']>[1],
			answer: unknown
		): ReturnType<Question['formatAnswerForSummary']> => {
			const rows = question.formatAnswerForSummary(sectionSegment, journey, answer);

			for (const row of rows) {
				if (!cloned.editable) {
					// Create-flow fields: remove the action link entirely
					delete row.action;
				} else if (cloned.url && row.action && 'href' in row.action) {
					// Detail fields: fix the href to use the correct section/url
					const getUrl = (journey as unknown as Record<string, unknown>)['getCurrentQuestionUrl'] as (
						section: string,
						question: string
					) => string;
					row.action.href = getUrl(sectionSegment, cloned.url);
				}
			}

			return rows;
		};

		return cloned;
	}
}
