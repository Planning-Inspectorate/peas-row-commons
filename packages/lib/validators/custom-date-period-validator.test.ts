import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult, type ValidationChain } from 'express-validator';
import CustomDatePeriodValidator from './custom-date-period-validator.ts';

interface DateValidationSettings {
	ensureFuture: boolean;
	ensurePast: boolean;
}

interface ValidatorOptions {
	inputLabel?: string;
	dateValidationSettings?: DateValidationSettings;
	startDateValidationSettings?: DateValidationSettings;
	endDateValidationSettings?: DateValidationSettings;
	endDateAfterStartDate?: boolean;
	endOptional?: boolean;
	endDateAfterStartDateMessage?: string;
}

interface MockRequest {
	body: Record<string, string | boolean | Record<string, string> | undefined>;
}

interface Question {
	fieldName: string;
}

describe('./validators/custom-date-period-validator.ts', () => {
	describe('validator', () => {
		it('should validate a valid date: leap year', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '29',
					['representationsPeriod_start_month']: '2',
					['representationsPeriod_start_year']: '2020',
					['representationsPeriod_end_day']: '5',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2020'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);
			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should validate a valid date', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);
			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should throw an error if no day, month or year provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: undefined,
					['representationsPeriod_start_month']: undefined,
					['representationsPeriod_start_year']: undefined,
					['representationsPeriod_end_day']: undefined,
					['representationsPeriod_end_month']: undefined,
					['representationsPeriod_end_year']: undefined
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 6);
			assert.strictEqual(errors[`${question.fieldName}_start_day`].msg, 'Enter Representations period start date');
			assert.strictEqual(errors[`${question.fieldName}_start_month`].msg, undefined);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
			assert.strictEqual(errors[`${question.fieldName}_end_day`].msg, 'Enter Representations period end date');
			assert.strictEqual(errors[`${question.fieldName}_end_month`].msg, undefined);
			assert.strictEqual(errors[`${question.fieldName}_end_year`].msg, undefined);
		});

		it('should throw an error if no day provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: undefined,
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date must include a day'
			);
		});

		it('should throw an error if no month provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: undefined,
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'Representations period start date must include a month'
			);
		});

		it('should throw an error if no year provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: undefined
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_end_year`].msg,
				'Representations period end date must include a year'
			);
		});

		it('should throw an error if no day or month provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: undefined,
					['representationsPeriod_end_month']: undefined,
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_end_day`].msg,
				'Representations period end date must include a day and month'
			);
			assert.strictEqual(errors[`${question.fieldName}_end_month`].msg, undefined);
		});

		it('should throw an error if no day or year provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: undefined,
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: undefined,
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date must include a day and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
		});

		it('should throw an error if no month or year provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '25',
					['representationsPeriod_start_month']: undefined,
					['representationsPeriod_start_year']: undefined,
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'Representations period start date must include a month and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
		});

		it('should throw an error if invalid day provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '52',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '2023',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date day must be a real day'
			);
		});

		it('should throw an error if invalid month provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '13',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '2024',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '15',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date month must be between 1 and 12'
			);
		});

		it('should throw an error if invalid year provided', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '2',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '24',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'Representations period start date year must include 4 numbers'
			);
		});

		it('should throw multiple errors if date has multiple missing/invalid components', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '2',
					['representationsPeriod_start_month']: '15',
					['representationsPeriod_start_year']: '24',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: undefined,
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'Representations period start date month must be between 1 and 12'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'Representations period start date year must include 4 numbers'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date must include a month'
			);
		});

		it('should throw errors if inputs are not numbers', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: true,
					['representationsPeriod_start_month']: '12',
					['representationsPeriod_start_year']: 'not a number',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: { obj: 'one' },
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date day must be a real day'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'Representations period start date year must include 4 numbers'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date month must be between 1 and 12'
			);
		});

		it('should throw an error if end date is before start date', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2024'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			const endErrorMsg = errors[`${question.fieldName}_end_day`].msg;
			assert.strictEqual(typeof endErrorMsg, 'string');

			const lowerMsg = (endErrorMsg as string).toLowerCase();
			assert.strictEqual(lowerMsg.includes('end date') && lowerMsg.includes('start date'), true);
		});

		it('should produce string-based error messages when constructed with a string inputLabel', async () => {
			const req: MockRequest = {
				body: {
					['date-question_start_day']: undefined,
					['date-question_start_month']: undefined,
					['date-question_start_year']: undefined
				}
			};

			const question: Question = { fieldName: 'date-question' };
			const errors = await _validationMappedErrors(req, question, 'Close Date');

			assert.strictEqual(Object.keys(errors).length >= 1, true);
			const containsLabel = Object.values(errors).some(
				(e: any) => typeof e.msg === 'string' && e.msg.includes('Close Date')
			);
			assert.strictEqual(containsLabel, true);
		});

		it('should validate a representation period when constructed with options object', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '1',
					['representationsPeriod_start_month']: '1',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '2',
					['representationsPeriod_end_month']: '1',
					['representationsPeriod_end_year']: '2025'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const opts: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: false
			};

			const errors = await _validationMappedErrors(req, question, opts);
			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should reject non-existent dates (e.g., 31 April) via rulesForValidInput', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '31',
					['representationsPeriod_start_month']: '4',
					['representationsPeriod_start_year']: '2023',
					['representationsPeriod_end_day']: '01',
					['representationsPeriod_end_month']: '05',
					['representationsPeriod_end_year']: '2023'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const opts: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, opts);

			assert.strictEqual(Object.keys(errors).length, 1);
			const msg = errors[`${question.fieldName}_start_day`].msg;
			assert.ok(msg === 'Representations period start date day must be a real day' || msg === 'Invalid value');
		});

		it('should throw multiple errors when both start and end dates have missing components', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: undefined,
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: undefined,
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: undefined,
					['representationsPeriod_end_year']: undefined
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 4);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date must include a day and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date must include a month and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_end_year`].msg, undefined);
		});

		it('should throw multiple errors when both start and end dates are invalid', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '35',
					['representationsPeriod_start_month']: '13',
					['representationsPeriod_start_year']: '2024',
					['representationsPeriod_end_day']: '32',
					['representationsPeriod_end_month']: '14',
					['representationsPeriod_end_year']: '2025'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 4);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date day must be a real day'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'Representations period start date month must be between 1 and 12'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_day`].msg,
				'Representations period end date day must be a real day'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date month must be between 1 and 12'
			);
		});

		it('should not throw an error when end date is same as start date', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '15',
					['representationsPeriod_start_month']: '6',
					['representationsPeriod_start_year']: '2027',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '6',
					['representationsPeriod_end_year']: '2027'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);
			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should throw an error when end date is in the past compared to start date', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '20',
					['representationsPeriod_start_month']: '12',
					['representationsPeriod_start_year']: '2027',
					['representationsPeriod_end_day']: '10',
					['representationsPeriod_end_month']: '12',
					['representationsPeriod_end_year']: '2027'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_end_day`].msg,
				'The end date must be on or after the start date'
			);
		});

		it('should throw errors for both start and end dates when both have invalid years', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: '25',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '10',
					['representationsPeriod_end_year']: '26'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: true, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'Representations period start date year must include 4 numbers'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_year`].msg,
				'Representations period end date year must include 4 numbers'
			);
		});

		it('should not trigger end-vs-start comparison when a date component is missing', async () => {
			const req: MockRequest = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: undefined,
					['representationsPeriod_end_day']: '01',
					['representationsPeriod_end_month']: '01',
					['representationsPeriod_end_year']: '2020'
				}
			};

			const question: Question = { fieldName: 'representationsPeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'Representations period start date must include a year'
			);

			const containsEndStartComparison = Object.values(errors).some(
				(endStartComparison: any) =>
					typeof endStartComparison.msg === 'string' &&
					endStartComparison.msg.toLowerCase().includes('end') &&
					endStartComparison.msg.toLowerCase().includes('start')
			);
			assert.strictEqual(containsEndStartComparison, false);
		});
	});

	describe('endOptional behaviour', () => {
		it('should pass when end date is completely empty and endOptional is true', async () => {
			const req: MockRequest = {
				body: {
					['abeyancePeriod_start_day']: '10',
					['abeyancePeriod_start_month']: '11',
					['abeyancePeriod_start_year']: '2026',
					['abeyancePeriod_end_day']: undefined,
					['abeyancePeriod_end_month']: undefined,
					['abeyancePeriod_end_year']: undefined
				}
			};

			const question: Question = { fieldName: 'abeyancePeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Abeyance period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true,
				endOptional: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);
			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should still require start date when endOptional is true', async () => {
			const req: MockRequest = {
				body: {
					['abeyancePeriod_start_day']: undefined,
					['abeyancePeriod_start_month']: undefined,
					['abeyancePeriod_start_year']: undefined,
					['abeyancePeriod_end_day']: undefined,
					['abeyancePeriod_end_month']: undefined,
					['abeyancePeriod_end_year']: undefined
				}
			};

			const question: Question = { fieldName: 'abeyancePeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Abeyance period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true,
				endOptional: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			// Should only have start-date errors, not end-date errors
			assert.strictEqual(Object.keys(errors).length, 3);
			assert.ok(errors['abeyancePeriod_start_day']);
			assert.strictEqual(errors['abeyancePeriod_end_day'], undefined);
		});

		it('should validate end date when partially filled and endOptional is true', async () => {
			const req: MockRequest = {
				body: {
					['abeyancePeriod_start_day']: '10',
					['abeyancePeriod_start_month']: '11',
					['abeyancePeriod_start_year']: '2026',
					['abeyancePeriod_end_day']: '15',
					['abeyancePeriod_end_month']: undefined,
					['abeyancePeriod_end_year']: undefined
				}
			};

			const question: Question = { fieldName: 'abeyancePeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Abeyance period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true,
				endOptional: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			// Should have end-date errors for missing month and year
			assert.ok(Object.keys(errors).length > 0);
			assert.ok(errors['abeyancePeriod_end_day'] || errors['abeyancePeriod_end_month']);
		});

		it('should validate end date before start date when endOptional is true and both provided', async () => {
			const req: MockRequest = {
				body: {
					['abeyancePeriod_start_day']: '20',
					['abeyancePeriod_start_month']: '12',
					['abeyancePeriod_start_year']: '2026',
					['abeyancePeriod_end_day']: '10',
					['abeyancePeriod_end_month']: '11',
					['abeyancePeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'abeyancePeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Abeyance period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true,
				endOptional: true,
				endDateAfterStartDateMessage: 'Abeyance start date must be before the abeyance end date'
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors['abeyancePeriod_end_day'].msg,
				'Abeyance start date must be before the abeyance end date'
			);
		});

		it('should pass with valid start and end dates when endOptional is true', async () => {
			const req: MockRequest = {
				body: {
					['abeyancePeriod_start_day']: '10',
					['abeyancePeriod_start_month']: '11',
					['abeyancePeriod_start_year']: '2026',
					['abeyancePeriod_end_day']: '10',
					['abeyancePeriod_end_month']: '12',
					['abeyancePeriod_end_year']: '2026'
				}
			};

			const question: Question = { fieldName: 'abeyancePeriod' };

			const validatorOptions: ValidatorOptions = {
				inputLabel: 'Abeyance period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true,
				endOptional: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);
			assert.strictEqual(Object.keys(errors).length, 0);
		});
	});
});

const _validationMappedErrors = async (
	req: MockRequest,
	question: Question,
	validatorOptions: ValidatorOptions | string = {}
): Promise<Record<string, any>> => {
	const inputLabel =
		typeof validatorOptions === 'string'
			? validatorOptions
			: (validatorOptions?.inputLabel ?? 'Representations period');

	const defaultDateValidationSettings: DateValidationSettings = (typeof validatorOptions !== 'string'
		? validatorOptions?.dateValidationSettings
		: undefined) ?? {
		ensureFuture: false,
		ensurePast: false
	};

	const startDateValidationSettings: DateValidationSettings =
		typeof validatorOptions === 'string'
			? defaultDateValidationSettings
			: (validatorOptions?.startDateValidationSettings ?? defaultDateValidationSettings);

	const endDateValidationSettings: DateValidationSettings =
		typeof validatorOptions === 'string'
			? defaultDateValidationSettings
			: (validatorOptions?.endDateValidationSettings ?? defaultDateValidationSettings);

	const endDateAfterStartDate =
		typeof validatorOptions === 'string' ? true : (validatorOptions?.endDateAfterStartDate ?? true);

	const endOptional = typeof validatorOptions === 'string' ? false : (validatorOptions?.endOptional ?? false);

	const endDateAfterStartDateMessage =
		typeof validatorOptions === 'string' ? undefined : validatorOptions?.endDateAfterStartDateMessage;

	const validationRules: ValidationChain[] = new CustomDatePeriodValidator(
		inputLabel,
		startDateValidationSettings,
		endDateValidationSettings,
		endDateAfterStartDate,
		endOptional,
		endDateAfterStartDateMessage
	).validate(question);

	await Promise.all(validationRules.map((validator) => validator.run(req as any)));

	const errors = validationResult(req as any);
	return errors.mapped();
};
