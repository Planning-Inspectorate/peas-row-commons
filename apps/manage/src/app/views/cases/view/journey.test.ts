import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.ts';

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
				questions: ['caseType', 'caseSubtype', 'act', 'consentSought', 'inspectorBand', 'primaryProcedure']
			},
			{
				title: 'Case details',
				segment: 'case-details',
				questions: [
					'reference',
					'externalReference',
					'internalReference',
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
				title: 'Documents',
				segment: 'documents',
				questions: ['filesLocation']
			},
			{
				title: 'Costs',
				segment: 'costs',
				questions: ['rechargeable', 'finalCost', 'feeReceived', 'invoiceSent']
			},
			{
				title: 'Withdrawal or abeyance',
				segment: 'withdrawal-abeyance',
				questions: ['withdrawalDate', 'abeyanceStartDate', 'abeyanceEndDate']
			},
			{
				title: 'Team',
				segment: 'team',
				questions: ['caseOfficer']
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
			}
		];

		assert.strictEqual(journey.sections.length, 11, 'Journey should have exactly 11 sections');

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
