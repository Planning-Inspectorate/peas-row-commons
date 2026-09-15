import { ManageListSection } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { DynamicSectionBuilder } from './dynamic-section-builder.ts';

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

	/**
	 * These use the real dynamic-forms classes rather than the mocks above, because the bug they
	 * guard against lives in Question's manage list answer resolution and in the private class
	 * field "branding" that the clone Proxy exists to preserve.
	 */
	describe('Cloning real dynamic-forms questions', () => {
		const buildRealSection = () => {
			const question = new Question({
				title: 'Hearing format',
				question: 'What is the hearing format?',
				viewFolder: 'radio',
				fieldName: 'hearingFormatId',
				url: 'hearing-format'
			});

			const manageListSection = new ManageListSection().addQuestion(question);

			const response = {
				answers: {
					procedureDetails: [{ id: 'proc-1', hearingFormatId: 'in-person' }]
				}
			} as unknown as JourneyResponse;

			const builder = new DynamicSectionBuilder('procedureDetails', manageListSection as unknown as Section);
			const [section] = builder.build(response);

			return { question, section, response };
		};

		const mockJourney = {
			taskListUrl: '/cases/case-1',
			journeyTemplate: 'template.njk',
			journeyTitle: 'Case details',
			getBackLink: () => '/cases/case-1/procedure-1/procedureDetails_0_hearingFormatId'
		};

		it('should not mark clones as being in a manage list section', () => {
			const { question, section } = buildRealSection();

			assert.strictEqual(question.isInManageListSection, true);
			assert.strictEqual(section.questions[0].isInManageListSection, false);
		});

		it('should leave the original question marked as in a manage list section', () => {
			const { question } = buildRealSection();

			// the clone must not mutate the shared question instance
			assert.strictEqual(question.isInManageListSection, true);
			assert.strictEqual(question.fieldName, 'hearingFormatId');
			assert.strictEqual(question.url, 'hearing-format');
		});

		it('should build a view model from the flattened answer without manage list route params', () => {
			const { section, response } = buildRealSection();
			const clone = section.questions[0];

			const viewModel = clone.toViewModel({
				params: { section: 'procedure-1', question: 'hearing-format' },
				section,
				journey: { ...mockJourney, response } as never
			} as never);

			assert.strictEqual(viewModel.question.fieldName, 'procedureDetails_0_hearingFormatId');
			assert.strictEqual(viewModel.answer, 'in-person');
		});

		it('should send the back link to the task list rather than a sibling clone', () => {
			const { section, response } = buildRealSection();
			const clone = section.questions[0];

			const viewModel = clone.toViewModel({
				params: { section: 'procedure-1', question: 'hearing-format' },
				section,
				journey: { ...mockJourney, response } as never
			} as never);

			assert.strictEqual(viewModel.backLink, '/cases/case-1');
		});

		it('should still resolve the clone answer via methods that use private class fields', () => {
			const { section, response } = buildRealSection();
			const clone = section.questions[0];

			const summary = clone.formatAnswerForSummary(
				'procedure-1',
				{ ...mockJourney, response, getCurrentQuestionUrl: () => '' } as never,
				'in-person'
			);

			assert.strictEqual(summary[0].value, 'In-person');
		});
	});
});
