import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DynamicSectionBuilder } from './dynamic-section-builder.ts';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';

interface MockResponse {
	answers: Record<string, unknown>;
}

class MockQuestion {
	fieldName: string;
	customProperty = 'preserves-prototype';
	displayCondition: (res: MockResponse) => boolean;
	editable?: boolean;
	url?: string;

	constructor(fieldName: string, displayCondition = (param: MockResponse) => true) {
		this.fieldName = fieldName;
		this.displayCondition = displayCondition;
	}

	shouldDisplay(response: MockResponse): boolean {
		return this.displayCondition(response);
	}

	answerObjectFromJourneyResponse(response: MockResponse): Record<string, unknown> {
		return { original: true };
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

describe('DynamicSectionBuilder', () => {
	let mockManageListSection: MockSection;
	let mockJourneyResponse: MockResponse;

	beforeEach(() => {
		mockManageListSection = new MockSection('Manage List', 'manage-list');
		mockJourneyResponse = {
			answers: {}
		};
	});

	describe('Initialization and Empty States', () => {
		it('should return an empty array if the listFieldName does not exist in answers', () => {
			const builder = new DynamicSectionBuilder('outcomeDetails', mockManageListSection as unknown as Section);
			const result = builder.build(mockJourneyResponse as unknown as JourneyResponse);

			assert.deepStrictEqual(result, []);
		});

		it('should return an empty array if the items array is empty', () => {
			mockJourneyResponse.answers.outcomeDetails = [];
			const builder = new DynamicSectionBuilder('outcomeDetails', mockManageListSection as unknown as Section);

			const result = builder.build(mockJourneyResponse as unknown as JourneyResponse);
			assert.deepStrictEqual(result, []);
		});
	});

	describe('Data Flattening', () => {
		it('should flatten nested array data into root answers with unique field names', () => {
			mockManageListSection.addQuestion(new MockQuestion('decisionType'));
			mockManageListSection.addQuestion(new MockQuestion('outcomeDate'));

			mockJourneyResponse.answers.outcomeDetails = [
				{ decisionType: 'Granted', outcomeDate: '2026-01-01' },
				{ decisionType: 'Refused', outcomeDate: '2026-02-01' }
			];

			const builder = new DynamicSectionBuilder('outcomeDetails', mockManageListSection as unknown as Section);
			builder.build(mockJourneyResponse as unknown as JourneyResponse);

			assert.strictEqual(mockJourneyResponse.answers['outcomeDetails_0_decisionType'], 'Granted');
			assert.strictEqual(mockJourneyResponse.answers['outcomeDetails_0_outcomeDate'], '2026-01-01');

			assert.strictEqual(mockJourneyResponse.answers['outcomeDetails_1_decisionType'], 'Refused');
			assert.strictEqual(mockJourneyResponse.answers['outcomeDetails_1_outcomeDate'], '2026-02-01');
		});
	});

	describe('Section Generation & Display Conditions', () => {
		it('should generate the correct number of sections with default titles', () => {
			mockManageListSection.addQuestion(new MockQuestion('decisionType'));

			mockJourneyResponse.answers.outcomeDetails = [{ decisionType: 'A' }, { decisionType: 'B' }];

			const builder = new DynamicSectionBuilder('outcomeDetails', mockManageListSection as unknown as Section);

			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			assert.strictEqual(sections.length, 2);
			assert.strictEqual(sections[0].name, 'Item 1');
			assert.strictEqual(sections[1].name, 'Item 2');
		});

		it('should only add questions to the section if shouldDisplay evaluates to true for that specific item', () => {
			const genericQuestion = new MockQuestion('decisionType');
			const conditionalQuestion = new MockQuestion('inspectorName', (res: MockResponse) => {
				return res.answers.decisionMaker === 'Inspector';
			});

			mockManageListSection.addQuestion(genericQuestion);
			mockManageListSection.addQuestion(conditionalQuestion);

			mockJourneyResponse.answers.outcomeDetails = [
				{ decisionType: 'Granted', decisionMaker: 'Inspector' },
				{ decisionType: 'Refused', decisionMaker: 'Officer' }
			];

			const builder = new DynamicSectionBuilder('outcomeDetails', mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			assert.strictEqual(sections[0].questions.length, 2);
			assert.strictEqual(sections[0].questions[0].fieldName, 'outcomeDetails_0_decisionType');
			assert.strictEqual(sections[0].questions[1].fieldName, 'outcomeDetails_0_inspectorName');

			assert.strictEqual(sections[1].questions.length, 1);
			assert.strictEqual(sections[1].questions[0].fieldName, 'outcomeDetails_1_decisionType');
		});
	});

	describe('Question Cloning', () => {
		it('should deeply clone questions and override specific properties', () => {
			const originalQuestion = new MockQuestion('decisionType');
			mockManageListSection.addQuestion(originalQuestion);

			mockJourneyResponse.answers.outcomeDetails = [{ decisionType: 'Granted' }];

			const builder = new DynamicSectionBuilder('outcomeDetails', mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];
			const clonedQuestion = sections[0].questions[0];

			assert.notStrictEqual(clonedQuestion, originalQuestion);

			assert.strictEqual(clonedQuestion.customProperty, 'preserves-prototype');

			assert.strictEqual(clonedQuestion.fieldName, 'outcomeDetails_0_decisionType');
			assert.strictEqual(clonedQuestion.editable, false);
			assert.strictEqual(clonedQuestion.url, '');

			assert.strictEqual(clonedQuestion.shouldDisplay({ answers: {} }), true);
		});
	});

	describe('Edge Cases & Defensive Checks', () => {
		it('should handle a ManageListSection that has no questions array defined', () => {
			delete (mockManageListSection as Partial<MockSection>).questions;

			mockJourneyResponse.answers.outcomeDetails = [{ decisionType: 'Granted' }];

			const builder = new DynamicSectionBuilder('outcomeDetails', mockManageListSection as unknown as Section);

			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			assert.strictEqual(sections.length, 1);
			assert.strictEqual(sections[0].questions.length, 0);
		});

		it('should safely render a question if it lacks a shouldDisplay method', () => {
			const weirdQuestion = new MockQuestion('weirdField');
			delete (weirdQuestion as Partial<MockQuestion>).shouldDisplay;

			mockManageListSection.addQuestion(weirdQuestion);
			mockJourneyResponse.answers.outcomeDetails = [{ weirdField: 'value' }];

			const builder = new DynamicSectionBuilder('outcomeDetails', mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			assert.strictEqual(sections[0].questions.length, 1);
			assert.strictEqual(sections[0].questions[0].fieldName, 'outcomeDetails_0_weirdField');
		});
	});

	describe('Extensibility', () => {
		it('should allow subclasses to override getSectionTitle', () => {
			class CustomTitleBuilder extends DynamicSectionBuilder {
				protected override getSectionTitle(item: Record<string, unknown>, index: number): string {
					return `Custom Title: ${String(item.type)} - ${index}`;
				}
			}

			mockManageListSection.addQuestion(new MockQuestion('type'));
			mockJourneyResponse.answers.outcomeDetails = [{ type: 'Special' }];

			const builder = new CustomTitleBuilder('outcomeDetails', mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			assert.strictEqual(sections[0].name, 'Custom Title: Special - 0');
		});
	});
});
