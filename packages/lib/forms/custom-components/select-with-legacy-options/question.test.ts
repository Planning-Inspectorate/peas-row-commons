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

	describe('formatAnswerForSummary', () => {
		it('should return the Option Text for an ACTIVE option', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'active');

			assert.strictEqual(result[0].value, 'Active Option');
			assert.strictEqual(result[0].key, 'Legacy Select Check');
		});

		it('should return the Option Text for a LEGACY option', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'retired');

			assert.strictEqual(result[0].value, 'Retired Option');
		});

		it('should show blank if no value found', () => {
			const result = question.formatAnswerForSummary('segment', mockJourney, 'unknown_value');

			assert.strictEqual(result[0].value, '');
		});
	});
});
