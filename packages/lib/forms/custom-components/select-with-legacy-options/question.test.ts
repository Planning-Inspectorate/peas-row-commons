import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import LegacySelectQuestion from './question.ts';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';

let mockJourney: Journey;
let question: LegacySelectQuestion;

const questionParams = {
	title: 'Legacy Select Check',
	question: 'What is the case type?',
	fieldName: 'legacy_select_field',
	options: [
		{
			text: 'Active Option',
			value: 'active'
		}
	],
	legacyOptions: [
		{
			text: 'Retired Option',
			value: 'retired'
		},
		{
			text: '<script>alert("xss")</script>',
			value: 'unsafe'
		}
	]
};

describe('Legacy Select Question', () => {
	beforeEach(() => {
		mockJourney = {
			response: {
				answers: {}
			}
		};

		question = new LegacySelectQuestion(questionParams);

		question.getAction = () => ({ href: '#', text: 'Change' });
	});

	describe('getOptionByValue', () => {
		it('should find an option from the standard options array', () => {
			const result = question.getOptionByValue('active');
			assert.strictEqual(result?.text, 'Active Option');
		});

		it('should find an option from the legacy options array', () => {
			const result = question.getOptionByValue('retired');
			assert.strictEqual(result?.text, 'Retired Option');
		});

		it('should return undefined if the value does not exist in either array', () => {
			const result = question.getOptionByValue('does-not-exist');
			assert.strictEqual(result, undefined);
		});
	});

	describe('formatAnswer', () => {
		it('should return notStartedText if the answer is null', () => {
			const result = question.formatAnswer(null);
			assert.strictEqual(result, question.notStartedText);
		});

		it('should return notStartedText if the answer is undefined', () => {
			const result = question.formatAnswer(undefined);
			assert.strictEqual(result, question.notStartedText);
		});

		it('should return notStartedText if the answer is an empty string', () => {
			const result = question.formatAnswer('');
			assert.strictEqual(result, question.notStartedText);
		});

		it('should return the escaped text for a standard option', () => {
			const result = question.formatAnswer('active');
			assert.strictEqual(result, 'Active Option');
		});

		it('should return the escaped text for a legacy option', () => {
			const result = question.formatAnswer('retired');
			assert.strictEqual(result, 'Retired Option');
		});

		it('should return an empty string if the value does not exist in either array', () => {
			const result = question.formatAnswer('does-not-exist');
			assert.strictEqual(result, '');
		});

		it('should HTML-escape the option text', () => {
			const result = question.formatAnswer('unsafe');
			assert.strictEqual(result, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
		});
	});

	describe('formatAnswerForSummary', () => {
		// formatAnswerForSummary is inherited (not overridden) from SelectQuestion and
		// delegates to this.formatAnswer under the hood - covered in detail above.
		// This single test confirms that delegation correctly resolves LEGACY values,
		// which is the whole point of this subclass existing.
		it('should return the Option Text for a LEGACY option via the inherited summary formatter', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'retired');

			assert.strictEqual(result[0].value, 'Retired Option');
			assert.strictEqual(result[0].key, 'Legacy Select Check');
		});
	});
});
