import { ADMIN_PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/index.ts';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/procedures.ts';
import { PROCEDURE_STATUSES, PROCEDURES } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import {
	DynamicSection,
	type JourneyResponse,
	ManageListSection,
	type Question,
	questionHasAnswer,
	whenQuestionHasAnswer
} from '@planning-inspectorate/dynamic-forms';
import type { CaseViewQuestions } from '../questions.ts';
import {
	getAdminInHouseQuestions,
	getCreateProcedureQuestions,
	getHearingQuestions,
	getInquiryQuestions,
	getSiteVisitQuestions,
	getWrittenRepsQuestions,
	type InspectorRadioConfig
} from '../questions-procedure.ts';
import type { mapProceduresToArray } from '../view-model.ts';

/**
 * Build the manage list section that defines the "add procedure" flow.
 */
export function buildProcedureManageList(questions: CaseViewQuestions): ManageListSection {
	return new ManageListSection()
		.addQuestion(questions.procedureType)
		.addQuestion(questions.procedureAdminType)
		.withCondition(whenQuestionHasAnswer(questions.procedureType, PROCEDURES_ID.ADMIN_IN_HOUSE))
		.addQuestion(questions.procedureSiteVisitType)
		.withCondition(whenQuestionHasAnswer(questions.procedureType, PROCEDURES_ID.SITE_VISIT))
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

export type ProcedureDetails = ReturnType<typeof mapProceduresToArray>;

export function getDynamicProcedureSections(config: InspectorRadioConfig, procedureDetails?: ProcedureDetails) {
	if (!procedureDetails) {
		return [];
	}
	const sections: DynamicSection[] = [];
	for (const procedure of procedureDetails) {
		const common = getCreateProcedureQuestions(config);
		switch (procedure.procedureTypeId) {
			case PROCEDURES_ID.SITE_VISIT:
				sections.push(siteVisitDynamicSection(procedure, common));
				break;
			case PROCEDURES_ID.HEARING:
				sections.push(hearingDynamicSection(procedure, common));
				break;
			case PROCEDURES_ID.INQUIRY:
				sections.push(inquiryDynamicSection(procedure, common));
				break;
			case PROCEDURES_ID.ADMIN_IN_HOUSE:
				sections.push(adminInHouseDynamicSection(procedure, common));
				break;
			case PROCEDURES_ID.WRITTEN_REPS:
				sections.push(writtenRepsDynamicSection(procedure, common));
				break;
		}
	}
	return sections;
}

function siteVisitDynamicSection(procedure: any, common: ReturnType<typeof getCreateProcedureQuestions>) {
	const questions = getSiteVisitQuestions();

	return newProcedureDynamicSection(procedure, common).addQuestion(questions.procedureSiteVisitDate);
}

function hearingDynamicSection(procedure: any, common: ReturnType<typeof getCreateProcedureQuestions>) {
	const questions = getHearingQuestions();
	return newProcedureDynamicSection(procedure, common)
		.addQuestion(questions.procedureSiteVisitDate)

		.addQuestion(questions.procedureEarliestHearingDate)
		.addQuestion(questions.procedureHearingTargetDate)
		.addQuestion(questions.procedurePartiesNotifiedOfHearingDate)

		.addQuestion(questions.procedureStatementsReceivedDate)
		.addQuestion(questions.procedureProofsReceivedDate)
		.addQuestion(questions.procedureCaseOfficerVerificationDate)

		.addQuestion(questions.procedureCmcDate)
		.addQuestion(questions.procedureCmcFormat)
		.addQuestion(questions.procedureCmcVenue)
		.addQuestion(questions.procedureCmcNoteSentDate)

		.addQuestion(questions.procedureConfirmedHearingDate)
		.addQuestion(questions.procedureHearingFormat)
		.addQuestion(questions.procedureHearingVenue)
		.addQuestion(questions.procedureHearingDateNotificationDate)
		.addQuestion(questions.procedureHearingVenueNotificationDate)
		.addQuestion(questions.procedureHearingClosedDate)
		.addQuestion(questions.procedureHearingPreparationTime)
		.addQuestion(questions.procedureHearingTravelTime)
		.addQuestion(questions.procedureHearingSittingTime)
		.addQuestion(questions.procedureHearingReportingTime);
}

function inquiryDynamicSection(procedure: any, common: ReturnType<typeof getCreateProcedureQuestions>) {
	const questions = getInquiryQuestions();

	return newProcedureDynamicSection(procedure, common)
		.addQuestion(questions.procedureSiteVisitDate)

		.addQuestion(questions.procedureEarliestInquiryDate)

		.addQuestion(questions.procedureStatementsReceivedDate)
		.addQuestion(questions.procedureProofsReceivedDate)
		.addQuestion(questions.procedureCaseOfficerVerificationDate)

		.addQuestion(questions.procedureInquiryOrConference)
		.addQuestion(questions.procedurePreInquiryMeetingDate)
		.addQuestion(questions.procedurePreInquiryFormat)
		.addQuestion(questions.procedurePreInquiryNoteSent)

		.addQuestion(questions.procedureCmcDate)
		.addQuestion(questions.procedureCmcFormat)
		.addQuestion(questions.procedureCmcVenue)
		.addQuestion(questions.procedureCmcNoteSentDate)

		.addQuestion(questions.procedureInquiryTargetDate)
		.addQuestion(questions.procedurePartiesNotifiedOfInquiryDate)
		.addQuestion(questions.procedureConfirmedInquiryDate)
		.addQuestion(questions.procedureInquiryFormat)
		.addQuestion(questions.procedureInquiryVenue)
		.addQuestion(questions.procedureInquiryDateNotificationDate)
		.addQuestion(questions.procedureInquiryVenueNotificationDate)
		.addQuestion(questions.procedureInquiryClosedDate)
		.addQuestion(questions.procedureInquiryPreparationTime)
		.addQuestion(questions.procedureInquiryTravelTime)
		.addQuestion(questions.procedureInquirySittingTime)
		.addQuestion(questions.procedureInquiryReportingTime);
}

function adminInHouseDynamicSection(procedure: any, common: ReturnType<typeof getCreateProcedureQuestions>) {
	const questions = getAdminInHouseQuestions();
	return newProcedureDynamicSection(procedure, common)
		.addQuestion(questions.procedureSiteVisitDate)
		.addQuestion(questions.procedureCaseOfficerVerificationDate)
		.addQuestion(questions.procedureInHouseDate);
}

function writtenRepsDynamicSection(procedure: any, common: ReturnType<typeof getCreateProcedureQuestions>) {
	const questions = getWrittenRepsQuestions();
	return newProcedureDynamicSection(procedure, common)
		.addQuestion(questions.procedureCaseOfficerVerificationDate)
		.addQuestion(questions.procedureOfferWrittenRepsDate)
		.addQuestion(questions.procedureDeadlineForConsent);
}

function newProcedureDynamicSection(
	procedure: { id: string; procedureTypeId?: string; procedureStatusId?: string },
	common: ReturnType<typeof getCreateProcedureQuestions>
) {
	const title = getSectionTitle(procedure, 0);
	return new DynamicSection(title, procedure.id, 'procedureDetails')
		.addQuestion(common.procedureType)
		.addQuestion(common.procedureAdminType)
		.withCondition(whenQuestionHasAnswer(common.procedureType, PROCEDURES_ID.ADMIN_IN_HOUSE))
		.addQuestion(common.procedureSiteVisitType)
		.withCondition(whenQuestionHasAnswer(common.procedureType, PROCEDURES_ID.SITE_VISIT))
		.addQuestion(common.procedureInspector)
		.withCondition((response) => {
			/**
			 * Inspector is shown for all types EXCEPT Admin when admin type is "case-officer".
			 * If type is Admin and admin type is case-officer, skip inspector.
			 * Otherwise (Hearing, Inquiry, Written Reps, Site Visit, Proposal), show it.
			 */
			const isAdmin = questionHasAnswer(response, common.procedureType, PROCEDURES_ID.ADMIN_IN_HOUSE);

			if (!isAdmin) {
				return true;
			}

			// For Admin, only show inspector if admin type is "inspector" (not "case-officer")
			return questionHasAnswer(response, common.procedureAdminType, ADMIN_PROCEDURES_ID.INSPECTOR);
		})
		.addQuestion(common.procedureStatus);
}

function getSectionTitle(item: Record<string, unknown>, index: number): string {
	const procedureType = PROCEDURES.find((p) => p.id === item.procedureTypeId);
	const procedureStatus = PROCEDURE_STATUSES.find((s) => s.id === item.procedureStatusId);

	const typeName = procedureType?.displayName || `Procedure ${index + 1}`;
	const statusName = procedureStatus?.displayName;

	return statusName ? `${typeName} (${statusName})` : typeName;
}
