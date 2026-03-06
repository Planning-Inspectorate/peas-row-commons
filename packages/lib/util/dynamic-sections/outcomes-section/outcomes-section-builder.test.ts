import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { OutcomeSectionBuilder } from './outcomes-section-builder.ts';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { DECISION_MAKER_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/decision-maker-type.ts';
import { DECISION_TYPES } from '@pins/peas-row-commons-database/src/seed/static_data/decision-type.ts';

interface MockResponse {
	answers: Record<string, unknown>;
}

class MockQuestion {
	fieldName: string;
	title: string;
	editable?: boolean;
	url?: string;
	displayCondition: (res: MockResponse) => boolean;

	constructor(fieldName: string, displayCondition = (param: MockResponse) => true) {
		this.fieldName = fieldName;
		this.title = fieldName;
		this.displayCondition = displayCondition;
	}

	shouldDisplay(response: MockResponse): boolean {
		return this.displayCondition(response);
	}

	formatAnswerForSummary(segment: string, journey: unknown, answer: unknown): { key?: string; value: unknown }[] {
		return [{ value: `MockFormatted: ${String(answer)}` }];
	}
}

class MockSection {
	name: string;
	url: string;
	questions: MockQuestion[] = [];

	constructor(title: string, url: string) {
		this.name = title;
		this.url = url;
	}

	addQuestion(question: MockQuestion): this {
		this.questions.push(question);
		return this;
	}
}

describe('OutcomeSectionBuilder', () => {
	let mockManageListSection: MockSection;
	let mockJourneyResponse: MockResponse;

	beforeEach(() => {
		mockManageListSection = new MockSection('Manage List', 'manage-list');
		mockJourneyResponse = { answers: {} };

		mockManageListSection.addQuestion(new MockQuestion('decisionTypeId'));
		mockManageListSection.addQuestion(new MockQuestion('decisionMakerTypeId'));
		mockManageListSection.addQuestion(new MockQuestion('decisionMakerInspectorId'));
		mockManageListSection.addQuestion(new MockQuestion('decisionMakerOfficerId'));
		mockManageListSection.addQuestion(new MockQuestion('outcomeDate'));
	});

	describe('Section Title Generation', () => {
		it('should use DECISION_TYPES displayName for the section title if matched', () => {
			const validDecisionType = DECISION_TYPES[0];

			if (validDecisionType) {
				mockJourneyResponse.answers.outcomeDetails = [{ decisionTypeId: validDecisionType.id }];

				const builder = new OutcomeSectionBuilder(mockManageListSection as unknown as Section);
				const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

				assert.strictEqual(sections[0].name, validDecisionType.displayName);
			}
		});

		it('should fall back to Outcome indexed string if decisionTypeId is not found', () => {
			mockJourneyResponse.answers.outcomeDetails = [{ decisionTypeId: 'non-existent-id' }];

			const builder = new OutcomeSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			assert.strictEqual(sections[0].name, 'Outcome 1');
		});
	});

	describe('Question Filtering and Injection', () => {
		it('should hide redundant raw fields and inject Originator', () => {
			mockJourneyResponse.answers.outcomeDetails = [{ decisionMakerTypeId: DECISION_MAKER_TYPE_ID.SECRETARY_OF_STATE }];

			const builder = new OutcomeSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			const generatedQuestions = sections[0].questions;

			assert.strictEqual(generatedQuestions.length, 2);

			assert.strictEqual(generatedQuestions[0].title, 'Originator');
			assert.strictEqual(generatedQuestions[0].fieldName, 'outcomeDetails_0_decisionMakerTypeId');

			assert.strictEqual(generatedQuestions[1].fieldName, 'outcomeDetails_0_outcomeDate');

			const hiddenFieldsFound = generatedQuestions.some(
				(q) =>
					q.fieldName.endsWith('decisionTypeId') ||
					q.fieldName.endsWith('decisionMakerInspectorId') ||
					q.fieldName.endsWith('decisionMakerOfficerId')
			);

			assert.strictEqual(hiddenFieldsFound, false);
		});
	});

	describe('Originator Formatting Logic', () => {
		it('should format correctly for Secretary of State', () => {
			mockJourneyResponse.answers.outcomeDetails = [
				{
					decisionMakerTypeId: DECISION_MAKER_TYPE_ID.SECRETARY_OF_STATE
				}
			];

			const builder = new OutcomeSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];
			const originatorQuestion = sections[0].questions[0];

			const summaryOutput = originatorQuestion.formatAnswerForSummary('', {}, null);

			assert.deepStrictEqual(summaryOutput, [
				{
					key: 'Originator',
					value: 'Secretary of State'
				}
			]);
		});

		it('should format correctly for Inspector with an ID provided', () => {
			mockJourneyResponse.answers.outcomeDetails = [
				{
					decisionMakerTypeId: DECISION_MAKER_TYPE_ID.INSPECTOR,
					decisionMakerInspectorId: 'John Doe'
				}
			];

			const builder = new OutcomeSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];
			const originatorQuestion = sections[0].questions[0];

			const summaryOutput = originatorQuestion.formatAnswerForSummary('', {}, null);

			assert.deepStrictEqual(summaryOutput, [
				{
					key: 'Originator',
					value: 'Inspector<br>MockFormatted: John Doe'
				}
			]);
		});

		it('should format correctly for Inspector when no ID is provided', () => {
			mockJourneyResponse.answers.outcomeDetails = [
				{
					decisionMakerTypeId: DECISION_MAKER_TYPE_ID.INSPECTOR
				}
			];

			const builder = new OutcomeSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];
			const originatorQuestion = sections[0].questions[0];

			const summaryOutput = originatorQuestion.formatAnswerForSummary('', {}, null);

			assert.deepStrictEqual(summaryOutput, [
				{
					key: 'Originator',
					value: 'Inspector'
				}
			]);
		});

		it('should format correctly for Officer with an ID provided', () => {
			mockJourneyResponse.answers.outcomeDetails = [
				{
					decisionMakerTypeId: DECISION_MAKER_TYPE_ID.OFFICER,
					decisionMakerOfficerId: 'Jane Doe'
				}
			];

			const builder = new OutcomeSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];
			const originatorQuestion = sections[0].questions[0];

			const summaryOutput = originatorQuestion.formatAnswerForSummary('', {}, null);

			assert.deepStrictEqual(summaryOutput, [
				{
					key: 'Originator',
					value: 'Officer<br>MockFormatted: Jane Doe'
				}
			]);
		});

		it('should format with a fallback string for unknown decisionMakerTypeIds', () => {
			mockJourneyResponse.answers.outcomeDetails = [
				{
					decisionMakerTypeId: 'unknown-alien-type'
				}
			];

			const builder = new OutcomeSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];
			const originatorQuestion = sections[0].questions[0];

			const summaryOutput = originatorQuestion.formatAnswerForSummary('', {}, null);

			assert.deepStrictEqual(summaryOutput, [
				{
					key: 'Originator',
					value: '—'
				}
			]);
		});
	});
});
