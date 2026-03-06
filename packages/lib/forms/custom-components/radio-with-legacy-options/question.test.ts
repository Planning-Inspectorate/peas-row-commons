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

	describe('formatAnswerForSummary', () => {
		it('should return the Option Text for an ACTIVE option', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'active');

			assert.strictEqual(result[0].value, 'Active Option');
			assert.strictEqual(result[0].key, 'Legacy Radio Check');
		});

		it('should return the Option Text for a LEGACY option', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'retired');

			assert.strictEqual(result[0].value, 'Retired Option');
		});

		it('should format conditional answers for a LEGACY option correctly', () => {
			const answerObj = {
				value: 'retired_cond',
				conditional: 'It is too old'
			};

			const result = question.formatAnswerForSummary('segment', mockJourney, answerObj);

			const expectedText = ['Retired Conditional', 'Reason: It is too old'].join('<br>');
			assert.strictEqual(result[0].value, expectedText);
		});

		it('should show blank if no value found', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'unknown_value');

			assert.strictEqual(result[0].value, '');
		});
	});
});
