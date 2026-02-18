import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	dateQuestion,
	camelCaseToKebabCase,
	camelCaseToSentenceCase,
	ALL_QUESTIONS,
	handleOriginatorFormattingFn
} from './question-utils.ts';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';

describe('questions utils', () => {
	describe('dateQuestion factory', () => {
		it('should create a date question with defaults based on fieldName', () => {
			const fieldName = 'testDateParameter';
			const expectedTitle = 'Test date parameter';
			const expectedUrl = 'test-date-parameter';
			const expectedHint = 'For example, 27 3 2007';

			const question = dateQuestion({ fieldName });

			assert.strictEqual(question.fieldName, fieldName);
			assert.strictEqual(question.type, COMPONENT_TYPES.DATE);
			assert.strictEqual(question.title, expectedTitle);
			assert.strictEqual(question.url, expectedUrl);
			assert.strictEqual(question.hint, expectedHint);
			assert.strictEqual(question.question, `What is the ${expectedTitle.toLowerCase()}?`);

			assert.ok(Array.isArray(question.validators));
			assert.strictEqual(question.validators.length, 1);
		});

		it('should accept overrides for title, question, url and hint', () => {
			const overrides = {
				fieldName: 'testField',
				title: 'Custom Title',
				question: 'Custom Question?',
				url: 'custom-url',
				hint: 'DD MM YYYY'
			};

			const question = dateQuestion(overrides);

			assert.strictEqual(question.title, overrides.title);
			assert.strictEqual(question.question, overrides.question);
			assert.strictEqual(question.url, overrides.url);
			assert.strictEqual(question.hint, overrides.hint);
		});

		it('should pass through viewData', () => {
			const viewData = { someProp: 'someValue' };
			const question = dateQuestion({ fieldName: 'test', viewData });

			assert.deepStrictEqual(question.viewData, viewData);
		});
	});
	describe('camelCaseToSentenceCase', () => {
		it('should turn a basic camelCaseSentence into Sentence case', () => {
			const sentence = camelCaseToSentenceCase('thisIsAnExample');

			assert.ok(sentence);
			assert.strictEqual(sentence, 'This is an example');
		});
	});

	describe('camelCaseToKebabCase', () => {
		it('should turn a basic camelCaseSentence into kebab-case', () => {
			const kebab = camelCaseToKebabCase('thisIsAnExample');

			assert.ok(kebab);
			assert.strictEqual(kebab, 'this-is-an-example');
		});
	});

	describe('Question Configuration Data', () => {
		const getDuplicates = (arr: string[]) => arr.filter((item, index) => arr.indexOf(item) !== index);

		it('should have unique URLs for every question', () => {
			const questions = Object.values(ALL_QUESTIONS);

			const urls = questions.map((q: any) => q.url).filter((url) => typeof url === 'string' && url !== '');

			const duplicates = getDuplicates(urls);
			const uniqueDuplicates = [...new Set(duplicates)];

			if (uniqueDuplicates.length > 0) {
				console.error('Collision detected! The following URLs are used more than once:', uniqueDuplicates);
			}

			assert.strictEqual(
				duplicates.length,
				0,
				`Found ${duplicates.length} duplicate URLs (see console). Routes will clash.`
			);
		});
	});

	describe('handleOriginatorFormattingFn', () => {
		const TYPES = {
			OFFICER: 'officer',
			INSPECTOR: 'inspector',
			SOS: 'secretary-of-state'
		};

		const createMockContext = (formatReturnValue: string | null = 'Formatted Name') => ({
			mockJourney: {},
			getQuestion: (_fieldName: string) => ({
				formatAnswerForSummary: () => [{ value: formatReturnValue }]
			})
		});

		it('should format Officer with name when answer is present', () => {
			const row = { decisionMakerOfficerId: 'officer-123' };
			const context = createMockContext('John Officer');

			const result = handleOriginatorFormattingFn(TYPES.OFFICER, row, context as any);

			assert.strictEqual(result, 'Officer<br>John Officer');
		});

		it('should return just the role "Officer" if the answer row is missing', () => {
			const row = {};
			const context = createMockContext();

			const result = handleOriginatorFormattingFn(TYPES.OFFICER, row, context as any);

			assert.strictEqual(result, 'Officer');
		});

		it('should format Inspector with name when answer is present', () => {
			const row = { decisionMakerInspectorId: 'inspector-456' };
			const context = createMockContext('Jane Inspector');

			const result = handleOriginatorFormattingFn(TYPES.INSPECTOR, row, context as any);

			assert.strictEqual(result, 'Inspector<br>Jane Inspector');
		});

		it('should return "Secretary of State" for SoS type', () => {
			const row = {};
			const context = createMockContext();

			const result = handleOriginatorFormattingFn(TYPES.SOS, row, context as any);

			assert.strictEqual(result, 'Secretary of State');
		});

		it('should return an em-dash "—" for unknown types', () => {
			const row = {};
			const context = createMockContext();

			const result = handleOriginatorFormattingFn('unknown-type', row, context as any);

			assert.strictEqual(result, '—');
		});

		it('should return just the role if formatting returns empty value', () => {
			const row = { decisionMakerOfficerId: 'officer-123' };
			const context = {
				mockJourney: {},
				getQuestion: () => ({
					formatAnswerForSummary: () => []
				})
			};

			const result = handleOriginatorFormattingFn(TYPES.OFFICER, row, context as any);

			assert.strictEqual(result, 'Officer<br>');
		});
	});
});
