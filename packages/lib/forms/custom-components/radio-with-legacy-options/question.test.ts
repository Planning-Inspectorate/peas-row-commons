import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import LegacyRadioQuestion from './question.ts';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';

let mockJourney: Journey;
let question: LegacyRadioQuestion;

const questionParams = {
	title: 'Legacy Radio Check',
	question: 'What is the case type?',
	fieldName: 'legacy_radio_field',
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
			text: 'Retired Conditional',
			value: 'retired_cond',
			conditional: {
				label: 'Reason:'
			}
		},
		{
			text: '<script>alert("xss")</script>',
			value: 'unsafe'
		}
	]
};

describe('Legacy Radio Question', () => {
	beforeEach(() => {
		mockJourney = {
			response: {
				answers: {}
			}
		};

		question = new LegacyRadioQuestion(questionParams);

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

		it('should return the escaped text for a plain standard option', () => {
			const result = question.formatAnswer('active');
			assert.strictEqual(result, 'Active Option');
		});

		it('should return the escaped text for a plain legacy option', () => {
			const result = question.formatAnswer('retired');
			assert.strictEqual(result, 'Retired Option');
		});

		it('should return an empty string for a plain unknown value', () => {
			const result = question.formatAnswer('unknown_value');
			assert.strictEqual(result, '');
		});

		it('should HTML-escape a plain (non-conditional) option value', () => {
			const result = question.formatAnswer('unsafe');
			assert.strictEqual(result, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
		});

		it('should format a conditional answer for a LEGACY option correctly', () => {
			const answerObj = {
				value: 'retired_cond',
				conditional: {
					retired_cond: 'It is too old'
				}
			};

			const result = question.formatAnswer(answerObj);

			assert.strictEqual(result, ['Retired Conditional', 'Reason: It is too old'].join('<br>'));
		});

		it('should HTML-escape the conditional answer text', () => {
			const answerObj = {
				value: 'retired_cond',
				conditional: {
					retired_cond: '<script>alert("x")</script>'
				}
			};

			const result = question.formatAnswer(answerObj);

			assert.strictEqual(
				result,
				['Retired Conditional', 'Reason: &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'].join('<br>')
			);
		});

		it('should not show a conditional line if conditional has no entry for the answer value', () => {
			const answerObj = {
				value: 'retired_cond',
				conditional: {
					some_other_value: 'It is too old'
				}
			};

			const result = question.formatAnswer(answerObj);

			assert.strictEqual(result, 'Retired Conditional');
		});

		it('should return an empty string for an object answer with an unknown value', () => {
			const answerObj = {
				value: 'unknown_value',
				conditional: {
					unknown_value: 'It is too old'
				}
			};

			const result = question.formatAnswer(answerObj);

			assert.strictEqual(result, '');
		});
	});

	describe('formatAnswerForSummary', () => {
		// formatAnswerForSummary is inherited (not overridden) from RadioQuestion and
		// delegates to this.formatAnswer under the hood - covered in detail above.
		// These tests confirm that delegation correctly resolves LEGACY and conditional
		// values via the summary formatter, which is the whole point of this subclass existing.
		it('should return the Option Text for a LEGACY option via the inherited summary formatter', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'retired');

			assert.strictEqual(result[0].value, 'Retired Option');
			assert.strictEqual(result[0].key, 'Legacy Radio Check');
		});

		it('should format conditional answers for a LEGACY option via the inherited summary formatter', () => {
			const answerObj = {
				value: 'retired_cond',
				conditional: {
					retired_cond: 'It is too old'
				}
			};

			const result = question.formatAnswerForSummary('segment', mockJourney, answerObj);

			const expectedText = ['Retired Conditional', 'Reason: It is too old'].join('<br>');
			assert.strictEqual(result[0].value, expectedText);
		});
	});
});
