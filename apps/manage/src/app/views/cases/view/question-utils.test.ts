import { describe, it } from 'node:test';
import assert from 'node:assert';
import { dateQuestion, camelCaseToKebabCase, camelCaseToSentenceCase, ALL_QUESTIONS } from './question-utils.ts';
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
});
