import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import OptionalDateValidator from './validator.ts';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { Request } from 'express';

describe('OptionalDateValidator', () => {
	describe('validate', () => {
		it('should pass if all date fields are empty (optional)', async () => {
			const req = {
				body: {
					['test-date_day']: '',
					['test-date_month']: '',
					['test-date_year']: ''
				}
			};

			const question = {
				fieldName: 'test-date'
			};

			const errors = await _runOptionalDateValidation(req as Request, question as Question);

			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should pass if all date fields are undefined (optional)', async () => {
			const req = {
				body: {}
			};

			const question = {
				fieldName: 'test-date'
			};

			const errors = await _runOptionalDateValidation(req as Request, question as Question);

			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should trigger parent validation errors if at least one field has data (partial data)', async () => {
			const req = {
				body: {
					['test-date_day']: '12',
					['test-date_month']: '',
					['test-date_year']: ''
				}
			};

			const question = {
				fieldName: 'test-date'
			};

			const errors = await _runOptionalDateValidation(req as Request, question as any);

			assert.ok(Object.keys(errors).length > 0);
			console.log('quack', errors);
			assert.strictEqual(errors[`${question.fieldName}_month`].msg, 'Test date must include a month and year');
		});

		it('should trigger parent validation errors if data is invalid', async () => {
			const req = {
				body: {
					['test-date_day']: '32',
					['test-date_month']: '13',
					['test-date_year']: '2020'
				}
			};

			const question = {
				fieldName: 'test-date'
			};

			const errors = await _runOptionalDateValidation(req as Request, question as Question);

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'Test date day must be a real day');
			assert.strictEqual(errors[`${question.fieldName}_month`].msg, 'Test date month must be between 1 and 12');
		});

		it('should pass if a full valid date is provided', async () => {
			const req = {
				body: {
					['test-date_day']: '01',
					['test-date_month']: '01',
					['test-date_year']: '2024'
				}
			};

			const question = {
				fieldName: 'test-date'
			};

			const errors = await _runOptionalDateValidation(req as Request, question as Question);

			assert.strictEqual(Object.keys(errors).length, 0);
		});
	});
});

const _runOptionalDateValidation = async (req: Request, question: Question) => {
	const validator = new OptionalDateValidator('test date');
	const validationRules = validator.validate(question);

	await Promise.all(validationRules.map((rule) => rule.run(req)));

	return validationResult(req).mapped();
};
