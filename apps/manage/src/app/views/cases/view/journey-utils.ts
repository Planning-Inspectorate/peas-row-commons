import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/procedures.ts';
import { questionHasAnswer } from '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { createProcedureQuestions } from './question-utils.ts';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';

const isHearingType = (response: JourneyResponse, typeQuestion: any) =>
	questionHasAnswer(response, typeQuestion, PROCEDURES_ID.HEARING);

const isInquiryType = (response: JourneyResponse, typeQuestion: any) =>
	questionHasAnswer(response, typeQuestion, PROCEDURES_ID.INQUIRY);

const isAdminType = (response: JourneyResponse, typeQuestion: any) =>
	questionHasAnswer(response, typeQuestion, PROCEDURES_ID.ADMIN_IN_HOUSE);

const isSiteVisitType = (response: JourneyResponse, typeQuestion: any) =>
	questionHasAnswer(response, typeQuestion, PROCEDURES_ID.ADMIN_IN_HOUSE);

const isWrittenRepsType = (response: JourneyResponse, typeQuestion: any) =>
	questionHasAnswer(response, typeQuestion, PROCEDURES_ID.ADMIN_IN_HOUSE);

const isEitherInquiryOrHearing = (response: JourneyResponse, typeQuestion: any) =>
	isInquiryType(response, typeQuestion) || isHearingType(response, typeQuestion);

const hasTypeChosen = (response: JourneyResponse, typeQuestion: any) =>
	isInquiryType(response, typeQuestion) ||
	isHearingType(response, typeQuestion) ||
	isSiteVisitType(response, typeQuestion) ||
	isAdminType(response, typeQuestion) ||
	isWrittenRepsType(response, typeQuestion);

export function createProcedureSection(suffix: string, questions: ReturnType<typeof createProcedureQuestions>) {
	const sectionName = `Procedure ${suffix === 'One' ? '1' : suffix === 'Two' ? '2' : '3'}`;
	const sectionUrl = `procedure-${suffix.toLowerCase()}`;
	const prefix = `procedure${suffix}`;
	const conditionId = (base: string) => `${base}-${suffix}`;
	const question = (key: string) => questions[`${prefix}${key}`];

	return (
		new Section(sectionName, sectionUrl)
			/**
			 * Type is shown first alone.
			 */
			.addQuestion(question('Type'))

			/**
			 * Status & Site visit: Every procedure with a type sees these
			 */
			.startMultiQuestionCondition(conditionId('TYPE-CHOSEN'), (r) => hasTypeChosen(r, question('Type')))
			.addQuestion(question('Status'))
			.addQuestion(question('SiteVisitDate'))
			.endMultiQuestionCondition(conditionId('TYPE-CHOSEN'))

			/**
			 * Hearing target dates
			 */
			.startMultiQuestionCondition(conditionId(`${PROCEDURES_ID.HEARING}-TARGET`), (r) =>
				isHearingType(r, question('Type'))
			)
			.addQuestion(question('HearingTargetDate'))
			.addQuestion(question('PartiesNotifiedOfHearingDate'))
			.endMultiQuestionCondition(conditionId(`${PROCEDURES_ID.HEARING}-TARGET`))

			/**
			 * Inquiry target dates
			 */
			.startMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-TARGET`), (r) =>
				isInquiryType(r, question('Type'))
			)
			.addQuestion(question('InquiryTargetDate'))
			.addQuestion(question('PartiesNotifiedOfInquiryDate'))
			.endMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-TARGET`))

			/**
			 * Pre-event details: Inquiry & Hearing
			 */
			.startMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-${PROCEDURES_ID.HEARING}-PRE-DOCS`), (r) =>
				isEitherInquiryOrHearing(r, question('Type'))
			)
			.addQuestion(question('ProofsReceivedDate'))
			.addQuestion(question('StatementsReceivedDate'))
			.addQuestion(question('CaseOfficerVerificationDate'))
			.endMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-${PROCEDURES_ID.HEARING}-PRE-DOCS`))

			/**
			 * Pre-inquiry meeting data: Inquiry only
			 */
			.startMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-PIM`), (r) =>
				isInquiryType(r, question('Type'))
			)
			.addQuestion(question('InquiryOrConference'))
			.addQuestion(question('PreInquiryMeetingDate'))
			.addQuestion(question('PreInquiryFormat'))
			.addQuestion(question('PreInquiryNoteSent'))
			.endMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-PIM`))

			/**
			 * Conference data: Inquiry & Hearing
			 */
			.startMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-${PROCEDURES_ID.HEARING}-CMC`), (r) =>
				isEitherInquiryOrHearing(r, question('Type'))
			)
			.addQuestion(question('CmcDate'))
			.addQuestion(question('CmcFormat'))
			.addQuestion(question('CmcVenue'))
			.addQuestion(question('CmcNoteSentDate'))
			.endMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-${PROCEDURES_ID.HEARING}-CMC`))

			/**
			 * Hearing specifics
			 */
			.startMultiQuestionCondition(conditionId(`${PROCEDURES_ID.HEARING}-DETAILS`), (r) =>
				isHearingType(r, question('Type'))
			)
			.addQuestion(question('ConfirmedHearingDate'))
			.addQuestion(question('HearingFormat'))
			.addQuestion(question('HearingVenue'))
			.addQuestion(question('HearingDateNotificationDate'))
			.addQuestion(question('HearingVenueNotificationDate'))
			.addQuestion(question('EarliestHearingDate'))
			.addQuestion(question('HearingLength'))
			.addQuestion(question('HearingInTarget'))
			.addQuestion(question('HearingClosedDate'))
			.endMultiQuestionCondition(conditionId(`${PROCEDURES_ID.HEARING}-DETAILS`))

			/**
			 * Inquiry Specifics
			 */
			.startMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-DETAILS`), (r) =>
				isInquiryType(r, question('Type'))
			)
			.addQuestion(question('ConfirmedInquiryDate'))
			.addQuestion(question('InquiryFormat'))
			.addQuestion(question('InquiryVenue'))
			.addQuestion(question('InquiryDateNotificationDate'))
			.addQuestion(question('InquiryVenueNotificationDate'))
			.addQuestion(question('EarliestInquiryDate'))
			.addQuestion(question('InquiryLength'))
			.addQuestion(question('InquiryFinishedDate'))
			.addQuestion(question('InquiryInTarget'))
			.addQuestion(question('InquiryClosedDate'))
			.endMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-DETAILS`))

			/**
			 * Hearing metrics
			 */
			.startMultiQuestionCondition(conditionId(`${PROCEDURES_ID.HEARING}-METRICS`), (r) =>
				isHearingType(r, question('Type'))
			)
			.addQuestion(question('HearingPreparationTime'))
			.addQuestion(question('HearingTravelTime'))
			.addQuestion(question('HearingSittingTime'))
			.addQuestion(question('HearingReportingTime'))
			.endMultiQuestionCondition(conditionId(`${PROCEDURES_ID.HEARING}-METRICS`))

			/**
			 * Inquiry metrics
			 */
			.startMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-METRICS`), (r) =>
				isInquiryType(r, question('Type'))
			)
			.addQuestion(question('InquiryPreparationTime'))
			.addQuestion(question('InquiryTravelTime'))
			.addQuestion(question('InquirySittingTime'))
			.addQuestion(question('InquiryReportingTime'))
			.endMultiQuestionCondition(conditionId(`${PROCEDURES_ID.INQUIRY}-METRICS`))

			/**
			 * Admin questions
			 */
			.startMultiQuestionCondition(conditionId(PROCEDURES_ID.ADMIN_IN_HOUSE), (r) => isAdminType(r, question('Type')))
			.addQuestion(question('InHouseDate'))
			.addQuestion(question('AdminType'))
			.endMultiQuestionCondition(conditionId(PROCEDURES_ID.ADMIN_IN_HOUSE))

			/**
			 * Specific questions
			 */
			.addQuestion(question('OfferWrittenRepsDate'))
			.withCondition((response: JourneyResponse) =>
				questionHasAnswer(response, question('Type'), PROCEDURES_ID.WRITTEN_REPS)
			)
			.addQuestion(question('SiteVisitType'))
			.withCondition((response: JourneyResponse) =>
				questionHasAnswer(response, question('Type'), PROCEDURES_ID.SITE_VISIT)
			)
	);
}
