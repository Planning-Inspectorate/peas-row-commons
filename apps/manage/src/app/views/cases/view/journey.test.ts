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

	it('should create static sections with the correct order and questions', () => {
		const mockRes = {};
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any);

		const expectedStaticSections = [
			{
				title: 'Overview',
				segment: 'overview',
				questions: [
					'caseType',
					'caseSubtype',
					'act',
					'consentSought',
					'priority',
					'inspectorBand',
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
					'applicantDetails',
					'siteAddress',
					'location',
					'authority'
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
					'expectedSubmissionDate',
					'receivedDate',
					'targetDecisionDate',
					'startDate',
					'objectionPeriodEndsDate',
					'partiesDecisionNotificationDeadlineDate',
					'expiryDate',
					'proposedModificationsDate'
				]
			},
			{
				title: 'Key contacts',
				segment: 'key-contacts',
				questions: ['objectorDetails', 'contactDetails']
			},
			{
				title: 'Procedures',
				segment: 'procedures',
				questions: ['procedureDetails']
			}
		];

		expectedStaticSections.forEach((expected) => {
			const actualSection = journey.sections.find((s: any) => s.name === expected.title);

			assert.ok(actualSection, `Section '${expected.title}' should exist`);
			assert.strictEqual(actualSection.segment, expected.segment, `Section '${expected.title}' segment mismatch`);

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

	it('should create trailing static sections after dynamic procedure sections', () => {
		const mockRes = {};
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any);

		const expectedTrailingSections = [
			{
				title: 'Outcome overview',
				segment: 'outcome',
				questions: [
					'outcomeDetails',
					'partiesNotifiedDate',
					'orderDecisionDispatchDate',
					'sealedOrderReturnedDate',
					'decisionPublishedDate'
				]
			},
			{
				title: 'Additional resource locations',
				segment: 'additional-resource-locations',
				questions: ['filesLocation', 'relevantWebsiteLinks']
			},
			{
				title: 'Withdrawal or abeyance',
				segment: 'withdrawal-abeyance',
				questions: ['withdrawalDate', 'abeyanceStartDate', 'abeyanceEndDate']
			},
			{
				title: 'Invoicing',
				segment: 'invoicing',
				questions: ['rechargeable', 'finalCost', 'invoiceSent', 'feeReceived']
			}
		];

		expectedTrailingSections.forEach((expected) => {
			const actualSection = journey.sections.find((s: any) => s.name === expected.title);

			assert.ok(actualSection, `Section '${expected.title}' should exist`);
			assert.strictEqual(actualSection.segment, expected.segment, `Section '${expected.title}' segment mismatch`);

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

	it('should have a Procedures section with procedureDetails as a manage list question', () => {
		const mockRes = {};
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any);

		const proceduresSection = journey.sections.find((s: any) => s.name === 'Procedures');
		assert.ok(proceduresSection, 'Should have a Procedures section');
		assert.strictEqual(proceduresSection.segment, 'procedures');
		assert.strictEqual(proceduresSection.questions.length, 1);
		assert.strictEqual(proceduresSection.questions[0].fieldName, 'procedureDetails');
	});

	it('should place dynamic procedure sections between Procedures and Outcome overview', () => {
		const mockRes = {};
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any);

		const proceduresIdx = journey.sections.findIndex((s: any) => s.name === 'Procedures');
		const outcomeIdx = journey.sections.findIndex((s: any) => s.name === 'Outcome overview');

		assert.ok(proceduresIdx >= 0, 'Procedures section should exist');
		assert.ok(outcomeIdx >= 0, 'Outcome overview section should exist');
		assert.ok(outcomeIdx > proceduresIdx, 'Outcome overview should come after Procedures');
	});

	it('should place Procedures section after Key contacts', () => {
		const mockRes = {};
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any);

		const keyContactsIdx = journey.sections.findIndex((s: any) => s.name === 'Key contacts');
		const proceduresIdx = journey.sections.findIndex((s: any) => s.name === 'Procedures');

		assert.ok(keyContactsIdx >= 0, 'Key contacts section should exist');
		assert.ok(proceduresIdx > keyContactsIdx, 'Procedures should come after Key contacts');
	});
});
