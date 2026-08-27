import { DynamicSectionBuilder } from '../dynamic-section-builder.ts';
import { Section, type Question, type JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import { PROCEDURES } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import { PROCEDURE_STATUSES } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/procedures.ts';

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
 * Helper function that returns the list of unique fields for each procedure
 */
export function getUniqueProcedureFields(procedureTypeId: string): string[] {
	return PROCEDURE_TYPE_FIELD_MAP[procedureTypeId] || [];
}

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
	 * Override cloneQuestion to fix up detail field action links: the base Question.getAction()
	 * builds hrefs from `this.fieldName`, but cloned questions have their fieldName flattened
	 * (e.g. `procedureDetails_0_siteVisitDate`) for unique local-answer resolution, which no longer
	 * matches a routable question segment. We fix this by overriding getAction() to substitute the
	 * original `url` slug instead.
	 *
	 * Private class field access is already handled correctly by the base class's Proxy-based
	 * cloneQuestion (see DynamicSectionBuilder.cloneQuestion), so we build on top of that clone
	 * here rather than cloning again ourselves via Object.create.
	 */
	protected override cloneQuestion(question: Question, index: number): Question {
		const cloned = super.cloneQuestion(question, index);

		/**
		 * Delegate to the base clone's getAction (which safely preserves private field access,
		 * and reads `cloned.editable`/`cloned.url` correctly), then patch the resulting href to
		 * use the section segment + original url slug rather than the flattened fieldName.
		 */
		const baseGetAction = cloned.getAction.bind(cloned);

		cloned.getAction = (
			sectionSegment: string,
			journey: Parameters<Question['getAction']>[1],
			answer: unknown
		): ReturnType<Question['getAction']> => {
			const action = baseGetAction(sectionSegment, journey, answer);

			if (!action || Array.isArray(action) || !cloned.url) {
				return action;
			}

			const getUrl = journey['getCurrentQuestionUrl'];

			return { ...action, href: getUrl(sectionSegment, cloned.url) };
		};

		return cloned;
	}
}
