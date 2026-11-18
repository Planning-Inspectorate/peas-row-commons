import { SITE_VISITS_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/index.ts';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/procedures.ts';
import { JourneyResponse, Question } from '@planning-inspectorate/dynamic-forms';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createJourney, JOURNEY_ID } from './journey.ts';
import type { InspectorRadioConfig } from './questions-procedure.ts';

describe('case details journey', () => {
	const mockConfig: InspectorRadioConfig = {
		selected: [],
		inspectorGroupMembers: [],
		userDisplayNames: new Map()
	};

	function createProcedureJourney(
		procedureDetails: { id: string; procedureTypeId: string; siteVisitTypeId?: string }[]
	) {
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };
		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) =>
					new Question({
						title: String(prop),
						question: String(prop),
						viewFolder: 'radio',
						fieldName: String(prop),
						url: String(prop)
					})
			}
		);
		const response = new JourneyResponse(JOURNEY_ID, '123', { procedureDetails });
		return createJourney(
			mockQuestions as Parameters<typeof createJourney>[0],
			response,
			mockReq as Parameters<typeof createJourney>[2],
			mockConfig
		);
	}

	it('should error if used with the wrong router structure', () => {
		const mockQuestions = { reference: {} };
		const mockRes = {};

		assert.throws(
			() => createJourney(mockQuestions, mockRes as any, { params: {}, baseUrl: '/some/path' } as any, mockConfig),
			/id must be a single string value/
		);

		assert.throws(
			() =>
				createJourney(
					mockQuestions,
					mockRes as any,
					{ params: { id: 'id-1' }, baseUrl: '/some/other/path' } as any,
					mockConfig
				),
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

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any, mockConfig);

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

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any, mockConfig);

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
					'procedureDetails',
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
					'abeyancePeriod',
					'advertisedModificationStatus',
					'applicantDetails',
					'siteAddressDetails',
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
					'proposedModificationsDate',
					'objectionPeriodEndsDate',
					'partiesDecisionNotificationDeadlineDate',
					'expiryDate'
				]
			},
			{
				title: 'Key contacts',
				segment: 'key-contacts',
				questions: ['objectorDetails', 'contactDetails']
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

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any, mockConfig);

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

	it('should have abeyancePeriod in the Case details section between caseStatus and advertisedModificationStatus', () => {
		const mockRes = {};
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		);

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any, mockConfig);

		const caseDetailsSection = journey.sections.find((s: any) => s.name === 'Case details');
		assert.ok(caseDetailsSection, 'Case details section should exist');

		const fieldNames = caseDetailsSection.questions.map((q: any) => q.fieldName);
		const statusIdx = fieldNames.indexOf('caseStatus');
		const abeyanceIdx = fieldNames.indexOf('abeyancePeriod');
		const advertisedIdx = fieldNames.indexOf('advertisedModificationStatus');

		assert.ok(abeyanceIdx > statusIdx, 'abeyancePeriod should come after caseStatus');
		assert.ok(abeyanceIdx < advertisedIdx, 'abeyancePeriod should come before advertisedModificationStatus');
	});

	it('should have procedureDetails in the Overview section before relatedCaseDetails', () => {
		const mockRes = {};
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };
		const mockQuestions = new Proxy({}, { get: (_target, prop) => ({ fieldName: prop }) });

		const journey: any = createJourney(mockQuestions, mockRes as any, mockReq as any, mockConfig);

		const overviewSection = journey.sections.find((s: any) => s.name === 'Overview');
		const fieldNames = overviewSection.questions.map((q: any) => q.fieldName);
		const procedureIdx = fieldNames.indexOf('procedureDetails');
		const relatedIdx = fieldNames.indexOf('relatedCaseDetails');

		assert.ok(procedureIdx >= 0, 'procedureDetails should exist in Overview');
		assert.ok(procedureIdx < relatedIdx, 'procedureDetails should come before relatedCaseDetails');
	});

	it('should place dynamic procedure sections between Overview and Outcome overview', () => {
		const procedureDetails = [
			{ id: 'hearing', procedureTypeId: PROCEDURES_ID.HEARING },
			{ id: 'inquiry', procedureTypeId: PROCEDURES_ID.INQUIRY }
		];
		const journey = createProcedureJourney(procedureDetails);
		const overviewIdx = journey.sections.findIndex((s) => s.name === 'Overview');
		const outcomeIdx = journey.sections.findIndex((s) => s.name === 'Outcome overview');

		assert.ok(overviewIdx >= 0, 'Overview section should exist');
		assert.ok(outcomeIdx >= 0, 'Outcome overview section should exist');
		assert.deepStrictEqual(
			journey.sections.slice(outcomeIdx - procedureDetails.length, outcomeIdx).map((s) => s.segment),
			procedureDetails.map((procedure) => procedure.id)
		);
		assert.ok(
			outcomeIdx - procedureDetails.length > overviewIdx,
			'Dynamic procedure sections should come after Overview'
		);
	});

	it('should resolve and render an editable question in a dynamic procedure section', () => {
		const mockReq = { params: { id: '123' }, baseUrl: '/case/123/details' };

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) =>
					new Question({
						title: String(prop),
						question: String(prop),
						viewFolder: 'radio',
						fieldName: String(prop),
						url: String(prop)
					})
			}
		);

		const response: any = {
			answers: {
				procedureDetails: [
					{ id: 'proc-1', procedureTypeId: PROCEDURES_ID.HEARING, hearingVenue: { addressLine1: 'Town Hall' } }
				]
			}
		};

		const journey: any = createJourney(mockQuestions, response, mockReq as any, mockConfig);

		const section = journey.getSection('proc-1');
		assert.ok(section, 'dynamic procedure section should exist');

		const question = journey.getQuestionByParams({ section: 'proc-1', question: 'hearingVenue' });
		assert.ok(question, 'the question behind the Change link should resolve');
		assert.strictEqual(question.isInManageListSection, false);

		const viewModel = question.toViewModel({
			params: { section: 'proc-1', question: 'hearingVenue' },
			section,
			journey
		});

		assert.strictEqual(viewModel.answer?.addressLine1, 'Town Hall');
		assert.strictEqual(
			viewModel.backLink,
			journey.taskListUrl + '/proc-1/type-of-hearing',
			'Back link should be previous question'
		);
	});

	describe('procedure site visit type question', () => {
		const siteVisitProcedure = {
			id: 'site-visit',
			procedureTypeId: PROCEDURES_ID.SITE_VISIT,
			siteVisitTypeId: SITE_VISITS_ID.ARSV
		};
		const otherProcedures = [
			{ id: 'hearing', procedureTypeId: PROCEDURES_ID.HEARING, siteVisitTypeId: SITE_VISITS_ID.ASV },
			{ id: 'inquiry', procedureTypeId: PROCEDURES_ID.INQUIRY, siteVisitTypeId: SITE_VISITS_ID.USV },
			{ id: 'admin-in-house', procedureTypeId: PROCEDURES_ID.ADMIN_IN_HOUSE, siteVisitTypeId: SITE_VISITS_ID.ARSV },
			{
				id: 'written-representations',
				procedureTypeId: PROCEDURES_ID.WRITTEN_REPS,
				siteVisitTypeId: SITE_VISITS_ID.ASV
			}
		];
		const procedureDetails = [siteVisitProcedure, ...otherProcedures];

		for (const procedure of procedureDetails) {
			it(`should display the saved site visit type for ${procedure.id}`, () => {
				const journey = createProcedureJourney(procedureDetails);
				const section = journey.getSection(procedure.id);
				assert.ok(section);
				const params = { section: procedure.id, question: 'type-of-site-visit' };
				const question = journey.getQuestionByParams(params);
				assert.ok(question);
				assert.strictEqual(question.fieldName, 'siteVisitTypeId');

				const viewModel = question.toViewModel({ params, section, journey });

				assert.strictEqual(viewModel.answer, procedure.siteVisitTypeId);
			});
		}

		for (const procedure of otherProcedures) {
			it(`should provide a change link for ${procedure.id}`, () => {
				const journey = createProcedureJourney(procedureDetails);
				const question = journey.getQuestionByParams({ section: procedure.id, question: 'type-of-site-visit' });
				assert.ok(question);

				const action = question.getAction(procedure.id, journey, procedure.siteVisitTypeId);

				assert.ok(action && !Array.isArray(action));
				assert.strictEqual(action.href, `${journey.taskListUrl}/${procedure.id}/type-of-site-visit`);
			});
		}

		it('should not provide a change link for a site visit procedure', () => {
			/**
			 * The site visit type question is not editable in the dynamic section
			 * for a site visit procedure, so no change link should be provided.
			 * It is editable in the manage list, but that is a different question instance.
			 */
			const journey = createProcedureJourney(procedureDetails);
			const question = journey.getQuestionByParams({ section: siteVisitProcedure.id, question: 'type-of-site-visit' });
			assert.ok(question);

			const action = question.getAction(siteVisitProcedure.id, journey, siteVisitProcedure.siteVisitTypeId);

			assert.strictEqual(action, undefined);
		});
	});
});
