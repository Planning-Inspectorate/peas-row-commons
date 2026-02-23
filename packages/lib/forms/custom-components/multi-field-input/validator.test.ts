import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import AtLeastOneFieldValidator from './validator.ts';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { Request } from 'express';

describe('AtLeastOneFieldValidator', () => {
	describe('constructor', () => {
		it('should throw an error if fields array is empty', () => {
			assert.throws(
				() => new AtLeastOneFieldValidator({ fields: [] }),
				/AtLeastOneFieldValidator is invoked without any fields/
			);
		});

		it('should set default error message', () => {
			const validator = new AtLeastOneFieldValidator({ fields: ['test'] });
			assert.strictEqual(validator.errorMessage, 'Please complete at least one field');
		});

		it('should set custom error message', () => {
			const validator = new AtLeastOneFieldValidator({ fields: ['test'], errorMessage: 'Custom error' });
			assert.strictEqual(validator.errorMessage, 'Custom error');
		});
	});

	describe('validate', () => {
		const question = { fieldName: 'parentField' } as Question;

		it('should pass validation if at least one field has a value', async () => {
			const validator = new AtLeastOneFieldValidator({ fields: ['field1', 'field2'] });
			const req = { body: { field1: '', field2: 'value' } };

			const chains = validator.validate(question);
			await chains[0].run(req as Request);

			const errors = validationResult(req as Request).array();
			assert.strictEqual(errors.length, 0);
		});

		it('should pass validation if all fields have values', async () => {
			const validator = new AtLeastOneFieldValidator({ fields: ['field1', 'field2'] });
			const req = { body: { field1: 'value1', field2: 'value2' } };

			const chains = validator.validate(question);
			await chains[0].run(req as Request);

			const errors = validationResult(req as Request).array();
			assert.strictEqual(errors.length, 0);
		});

		it('should fail validation if all fields are empty strings', async () => {
			const validator = new AtLeastOneFieldValidator({ fields: ['field1', 'field2'], errorMessage: 'Custom error!' });
			const req = { body: { field1: '', field2: '' } };

			const chains = validator.validate(question);
			await chains[0].run(req as Request);

			const errors = validationResult(req as Request).array();
			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0].msg, 'Custom error!');
		});

		it('should fail validation if all fields contain only whitespace', async () => {
			const validator = new AtLeastOneFieldValidator({ fields: ['field1', 'field2'] });
			const req = { body: { field1: '   ', field2: '\n\t' } };

			const chains = validator.validate(question);
			await chains[0].run(req as Request);

			const errors = validationResult(req as Request).array();
			assert.strictEqual(errors.length, 1);
		});

		it('should fail validation if fields are not present in body', async () => {
			const validator = new AtLeastOneFieldValidator({ fields: ['field1', 'field2'] });
			const req = { body: { otherField: 'value' } };

			const chains = validator.validate(question);
			await chains[0].run(req as Request);

			const errors = validationResult(req as Request).array();
			assert.strictEqual(errors.length, 1);
		});
	});
});
