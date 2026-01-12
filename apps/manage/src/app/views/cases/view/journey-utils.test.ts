import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createProcedureSection } from './journey-utils.ts';

describe('createProcedureSection', () => {
	it('should configure the section properties correctly for Procedure One', () => {
		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const section: any = createProcedureSection('One', mockQuestions as any);

		assert.strictEqual(section.name, 'Procedure 1');
		assert.strictEqual(section.segment, 'procedure-one');
	});

	it('should configure the section properties correctly for Procedure Two', () => {
		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const section: any = createProcedureSection('Two', mockQuestions as any);

		assert.strictEqual(section.name, 'Procedure 2');
		assert.strictEqual(section.segment, 'procedure-two');
	});

	it('should add all questions with the correct prefix and order', () => {
		const suffix = 'One';
		const prefix = 'procedureOne';

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const section: any = createProcedureSection(suffix, mockQuestions as any);

		const expectedBaseKeys = [
			'Type',
			'Status',
			'SiteVisitDate',
			'HearingTargetDate',
			'PartiesNotifiedOfHearingDate',
			'InquiryTargetDate',
			'PartiesNotifiedOfInquiryDate',
			'ProofsReceivedDate',
			'StatementsReceivedDate',
			'CaseOfficerVerificationDate',
			'InquiryOrConference',
			'PreInquiryMeetingDate',
			'PreInquiryFormat',
			'PreInquiryNoteSent',
			'CmcDate',
			'CmcFormat',
			'CmcVenue',
			'CmcNoteSentDate',
			'ConfirmedHearingDate',
			'HearingFormat',
			'HearingVenue',
			'HearingDateNotificationDate',
			'HearingVenueNotificationDate',
			'EarliestHearingDate',
			'HearingLength',
			'HearingInTarget',
			'HearingClosedDate',
			'ConfirmedInquiryDate',
			'InquiryFormat',
			'InquiryVenue',
			'InquiryDateNotificationDate',
			'InquiryVenueNotificationDate',
			'EarliestInquiryDate',
			'InquiryLength',
			'InquiryFinishedDate',
			'InquiryInTarget',
			'InquiryClosedDate',
			'HearingPreparationTime',
			'HearingTravelTime',
			'HearingSittingTime',
			'HearingReportingTime',
			'InquiryPreparationTime',
			'InquiryTravelTime',
			'InquirySittingTime',
			'InquiryReportingTime',
			'InHouseDate',
			'AdminType',
			'OfferWrittenRepsDate',
			'SiteVisitType'
		];

		assert.strictEqual(
			section.questions.length,
			expectedBaseKeys.length,
			`Section should have exactly ${expectedBaseKeys.length} questions`
		);

		expectedBaseKeys.forEach((baseKey, index) => {
			const actualQuestion = section.questions[index];
			const expectedFieldName = `${prefix}${baseKey}`;

			assert.strictEqual(
				actualQuestion.fieldName,
				expectedFieldName,
				`Question at index ${index} should be '${expectedFieldName}'`
			);
		});
	});

	it('should correctly prefix questions for Procedure Three', () => {
		const suffix = 'Three';
		const prefix = 'procedureThree';

		const mockQuestions = new Proxy({}, { get: (_, prop) => ({ fieldName: prop }) });

		const section: any = createProcedureSection(suffix, mockQuestions as any);

		assert.strictEqual(section.questions[0].fieldName, `${prefix}Type`);
		assert.strictEqual(section.questions[section.questions.length - 1].fieldName, `${prefix}SiteVisitType`);
	});
});
