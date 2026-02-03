import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.ts';

const PROCEDURE_QUESTIONS = [
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

describe('case details journey', () => {
	it('should error if used with the wrong router structure', () => {
		const mockQuestions = { reference: {} };
		const mockRes = {};

		assert.throws(() => createJourney(mockQuestions, mockRes as any, { params: {}, baseUrl: '/some/path' } as any), {
			message: `not a valid request for the ${JOURNEY_ID} journey (no id param)`
		});

		assert.throws(
			() =>
				createJourney(mockQuestions, mockRes as any, { params: { id: 'id-1' }, baseUrl: '/some/other/path' } as any),
			{ message: `not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)` }
		);
	});
	it('should create a journey with the correct configuration', () => {
		const mockRes = {};
		const mockReq = {
			params: { id: '123' },
			baseUrl: '/case/123/details'
		};

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any);

		assert.strictEqual(journey.journeyId, JOURNEY_ID);
		assert.strictEqual(journey.journeyTitle, 'Case details');
		assert.strictEqual(journey.returnToListing, true);
		assert.strictEqual(journey.journeyTemplate, 'views/layouts/forms-question.njk');
		assert.strictEqual(journey.taskListTemplate, 'views/cases/view/view.njk');

		assert.strictEqual(journey.makeBaseUrl(), '/case/123/details');
	});

	it('should create sections with the correct order and questions', () => {
		const mockRes = {};
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any);

		const expectedStructure = [
			{
				title: 'Overview',
				segment: 'overview',
				questions: [
					'caseType',
					'caseSubtype',
					'act',
					'consentSought',
					'inspectorBand',
					'primaryProcedure',
					'relatedCaseDetails',
					'linkedCaseDetails'
				]
			},
			{
				title: 'Case details',
				segment: 'case-details',
				questions: [
					'reference',
					'externalReference',
					'historicalReference',
					'caseName',
					'caseStatus',
					'advertisedModificationStatus',
					'applicant',
					'siteAddress',
					'location',
					'authority',
					'priority'
				]
			},
			{
				title: 'Team',
				segment: 'team',
				questions: ['caseOfficer', 'inspectorDetails']
			},
			{
				title: 'Timetable',
				segment: 'timetable',
				questions: [
					'receivedDate',
					'startDate',
					'expectedSubmissionDate',
					'targetDecisionDate',
					'caseOfficerVerificationDate',
					'proposedModificationsDate',
					'objectionPeriodEndsDate',
					'consentDeadlineDate',
					'ogdDueDate',
					'proposalLetterDate',
					'expiryDate',
					'partiesDecisionNotificationDeadlineDate'
				]
			},
			{
				title: 'Key contacts',
				segment: 'key-contacts',
				questions: ['objectorDetails', 'contactDetails']
			},
			{
				title: 'Procedure 1',
				segment: 'procedure-one',
				questions: PROCEDURE_QUESTIONS.map((question) => `procedureOne${question}`)
			},
			{
				title: 'Procedure 2',
				segment: 'procedure-two',
				questions: PROCEDURE_QUESTIONS.map((question) => `procedureTwo${question}`)
			},
			{
				title: 'Procedure 3',
				segment: 'procedure-three',
				questions: PROCEDURE_QUESTIONS.map((question) => `procedureThree${question}`)
			},
			{
				title: 'Outcome',
				segment: 'outcome',
				questions: [
					'decisionType',
					'decisionMaker',
					'outcome',
					'inTarget',
					'outcomeDate',
					'decisionReceivedDate',
					'partiesNotifiedDate',
					'orderDecisionDispatchDate',
					'sealedOrderReturnedDate',
					'decisionPublishedDate',
					'isFencingPermanent'
				]
			},
			{
				title: 'Documents',
				segment: 'documents',
				questions: ['filesLocation']
			},
			{
				title: 'Withdrawal or abeyance',
				segment: 'withdrawal-abeyance',
				questions: ['withdrawalDate', 'abeyanceStartDate', 'abeyanceEndDate']
			},
			{
				title: 'Costs',
				segment: 'costs',
				questions: ['rechargeable', 'finalCost', 'feeReceived', 'invoiceSent']
			}
		];

		assert.strictEqual(journey.sections.length, 12, 'Journey should have exactly 12 sections');

		expectedStructure.forEach((expected, sIndex) => {
			const actualSection = journey.sections[sIndex];

			assert.strictEqual(actualSection.name, expected.title, `Section [${sIndex}] title mismatch`);
			assert.strictEqual(actualSection.segment, expected.segment, `Section [${sIndex}] segment mismatch`);

			assert.strictEqual(
				actualSection.questions.length,
				expected.questions.length,
				`Section '${expected.title}' has incorrect number of questions`
			);

			expected.questions.forEach((qKey, qIndex) => {
				const actualQuestion = actualSection.questions[qIndex];
				assert.strictEqual(
					actualQuestion.fieldName,
					qKey,
					`Section '${expected.title}' question at index ${qIndex} should be '${qKey}'`
				);
			});
		});
	});
});
