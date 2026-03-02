import { ManageListSection } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { questionHasAnswer } from '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/procedures.ts';
import { ADMIN_PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/index.ts';
import { ProcedureSectionBuilder } from '@pins/peas-row-commons-lib/util/dynamic-sections/procedures-section/procedure-section-builder.ts';

/**
 * Build the manage list section that defines the "add procedure" flow.
 */
export function buildProcedureManageList(questions: Record<string, unknown>): ManageListSection {
	return new ManageListSection()
		.addQuestion(questions.procedureType)
		.addQuestion(questions.procedureAdminType)
		.withCondition((response: JourneyResponse) =>
			questionHasAnswer(response, questions.procedureType, PROCEDURES_ID.ADMIN_IN_HOUSE)
		)
		.addQuestion(questions.procedureSiteVisitType)
		.withCondition((response: JourneyResponse) =>
			questionHasAnswer(response, questions.procedureType, PROCEDURES_ID.SITE_VISIT)
		)
		.addQuestion(questions.procedureInspector)
		.withCondition((response: JourneyResponse) => {
			/**
			 * Inspector is shown for all types EXCEPT Admin when admin type is "case-officer".
			 * If type is Admin and admin type is case-officer, skip inspector.
			 * Otherwise (Hearing, Inquiry, Written Reps, Site Visit, Proposal), show it.
			 */
			const isAdmin = questionHasAnswer(response, questions.procedureType, PROCEDURES_ID.ADMIN_IN_HOUSE);

			if (!isAdmin) {
				return true;
			}

			// For Admin, only show inspector if admin type is "inspector" (not "case-officer")
			return questionHasAnswer(response, questions.procedureAdminType, ADMIN_PROCEDURES_ID.INSPECTOR);
		})
		.addQuestion(questions.procedureStatus);
}

/**
 * Use ProcedureSectionBuilder to generate one section per procedure.
 *
 * The builder needs a "full" manage list section containing ALL procedure
 * questions (not just the add-flow ones). This is because the builder
 * iterates over these questions to build the summary sections.
 *
 * We create a separate "all questions" section for the builder that
 * includes both the create-flow fields and the detail fields.
 */
export function buildDynamicProcedureSections(
	procedureAllQuestionsSection: ManageListSection,
	response: JourneyResponse
): Section[] {
	const procedureBuilder = new ProcedureSectionBuilder(procedureAllQuestionsSection as Section);
	return procedureBuilder.build(response);
}

/**
 * Build the "all questions" manage list section used by ProcedureSectionBuilder.
 */
export function buildProcedureAllQuestionsSection(questions: Record<string, unknown>): ManageListSection {
	return (
		new ManageListSection()
			// Create-flow fields
			.addQuestion(questions.procedureType)
			.addQuestion(questions.procedureStatus)
			.addQuestion(questions.procedureAdminType)
			.withCondition((response: JourneyResponse) =>
				questionHasAnswer(response, questions.procedureType, PROCEDURES_ID.ADMIN_IN_HOUSE)
			)
			.addQuestion(questions.procedureInspector)
			.withCondition((response: JourneyResponse) => {
				const isAdmin = questionHasAnswer(response, questions.procedureType, PROCEDURES_ID.ADMIN_IN_HOUSE);

				if (!isAdmin) {
					return true;
				}

				return questionHasAnswer(response, questions.procedureAdminType, ADMIN_PROCEDURES_ID.INSPECTOR);
			})
			.addQuestion(questions.procedureSiteVisitType)
			.withCondition((response: JourneyResponse) =>
				questionHasAnswer(response, questions.procedureType, PROCEDURES_ID.SITE_VISIT)
			)
			.addQuestion(questions.procedureSiteVisitTypeDetail)
			.withCondition(
				(response: JourneyResponse) => !questionHasAnswer(response, questions.procedureType, PROCEDURES_ID.SITE_VISIT)
			)
			// Detail fields (all of them — the ProcedureSectionBuilder handles filtering by type)
			.addQuestion(questions.procedureSiteVisitDate)

			.addQuestion(questions.procedureEarliestInquiryDate)
			.addQuestion(questions.procedureEarliestHearingDate)
			.addQuestion(questions.procedureHearingTargetDate)
			.addQuestion(questions.procedurePartiesNotifiedOfHearingDate)

			.addQuestion(questions.procedureProofsReceivedDate)
			.addQuestion(questions.procedureStatementsReceivedDate)
			.addQuestion(questions.procedureCaseOfficerVerificationDate)

			.addQuestion(questions.procedureInquiryOrConference)
			.addQuestion(questions.procedurePreInquiryMeetingDate)
			.addQuestion(questions.procedurePreInquiryFormat)
			.addQuestion(questions.procedurePreInquiryNoteSent)

			.addQuestion(questions.procedureCmcDate)
			.addQuestion(questions.procedureCmcFormat)
			.addQuestion(questions.procedureCmcVenue)
			.addQuestion(questions.procedureCmcNoteSentDate)

			.addQuestion(questions.procedureConfirmedHearingDate)
			.addQuestion(questions.procedureHearingFormat)
			.addQuestion(questions.procedureHearingVenue)
			.addQuestion(questions.procedureHearingDateNotificationDate)
			.addQuestion(questions.procedureHearingVenueNotificationDate)
			.addQuestion(questions.procedureHearingLength)
			.addQuestion(questions.procedureHearingInTarget)
			.addQuestion(questions.procedureHearingClosedDate)
			.addQuestion(questions.procedureHearingPreparationTime)
			.addQuestion(questions.procedureHearingTravelTime)
			.addQuestion(questions.procedureHearingSittingTime)
			.addQuestion(questions.procedureHearingReportingTime)

			.addQuestion(questions.procedureInquiryTargetDate)
			.addQuestion(questions.procedurePartiesNotifiedOfInquiryDate)
			.addQuestion(questions.procedureConfirmedInquiryDate)
			.addQuestion(questions.procedureInquiryFormat)
			.addQuestion(questions.procedureInquiryVenue)
			.addQuestion(questions.procedureInquiryDateNotificationDate)
			.addQuestion(questions.procedureInquiryVenueNotificationDate)
			.addQuestion(questions.procedureInquiryLength)
			.addQuestion(questions.procedureInquiryFinishedDate)
			.addQuestion(questions.procedureInquiryInTarget)
			.addQuestion(questions.procedureInquiryClosedDate)
			.addQuestion(questions.procedureInquiryPreparationTime)
			.addQuestion(questions.procedureInquiryTravelTime)
			.addQuestion(questions.procedureInquirySittingTime)
			.addQuestion(questions.procedureInquiryReportingTime)

			.addQuestion(questions.procedureInHouseDate)
			.addQuestion(questions.procedureOfferWrittenRepsDate)
	);
}
