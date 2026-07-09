process.env.ENVIRONMENT = 'dev';

import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import {
	dateQuestion,
	camelCaseToKebabCase,
	camelCaseToSentenceCase,
	ALL_QUESTIONS,
	handleOriginatorFormattingFn,
	validateDateRangeIsAfterReceivedDate,
	validateDateIsAfterReceivedDate
} from './question-utils.ts';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';

describe('questions utils', () => {
	beforeEach(() => {
		process.env.ENVIRONMENT = 'dev'; // Used to get Authorities
	});
	afterEach(() => {
		delete process.env.ENVIRONMENT;
	});
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
			process.env.ENVIRONMENT = 'dev'; // Used to get Authorities
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
			process.env.ENVIRONMENT = 'dev'; // Used to get Authorities
			const viewData = { someProp: 'someValue' };
			const question = dateQuestion({ fieldName: 'test', viewData });

			assert.deepStrictEqual(question.viewData, viewData);
		});

		it('should merge additional validators with DateValidator', () => {
			const mockValidator = { validate: () => [] };
			const question = dateQuestion({
				fieldName: 'testField',
				validators: [mockValidator as any]
			});

			assert.ok(Array.isArray(question.validators));
			assert.strictEqual(question.validators.length, 2);
			assert.strictEqual(question.validators[1], mockValidator);
		});

		it('should merge additional validators with overrideValidator when both are provided', () => {
			const mockValidator = { validate: () => [] };
			class MockOverride {
				title: string;
				constructor(title: string) {
					this.title = title;
				}
				validate() {
					return [];
				}
			}
			const question = dateQuestion({
				fieldName: 'testField',
				overrideValidator: MockOverride as any,
				validators: [mockValidator as any]
			});

			assert.ok(Array.isArray(question.validators));
			assert.strictEqual(question.validators.length, 2);
			assert.strictEqual(question.validators[1], mockValidator);
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
			process.env.ENVIRONMENT = 'dev'; // Used to get Authorities
			const row = {};
			const context = createMockContext();

			const result = handleOriginatorFormattingFn(TYPES.OFFICER, row, context as any);

			assert.strictEqual(result, 'Officer');
		});

		it('should format Inspector with name when answer is present', () => {
			process.env.ENVIRONMENT = 'dev'; // Used to get Authorities
			const row = { decisionMakerInspectorId: 'inspector-456' };
			const context = createMockContext('Jane Inspector');

			const result = handleOriginatorFormattingFn(TYPES.INSPECTOR, row, context as any);

			assert.strictEqual(result, 'Inspector<br>Jane Inspector');
		});

		it('should return "Secretary of State" for SoS type', () => {
			process.env.ENVIRONMENT = 'dev'; // Used to get Authorities
			const row = {};
			const context = createMockContext();

			const result = handleOriginatorFormattingFn(TYPES.SOS, row, context as any);

			assert.strictEqual(result, 'Secretary of State');
		});

		it('should return an hyphen-minus "-" for unknown types', () => {
			process.env.ENVIRONMENT = 'dev'; // Used to get Authorities
			const row = {};
			const context = createMockContext();

			const result = handleOriginatorFormattingFn('unknown-type', row, context as any);

			assert.strictEqual(result, '-');
		});

		it('should return just the role if formatting returns empty value', () => {
			process.env.ENVIRONMENT = 'dev'; // Used to get Authorities
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

	describe('validateDateRangeIsAfterReceivedDate', () => {
		const label = 'Mock';

		it('should return true when receivedDate is null', () => {
			const datePeriod = { start: new Date(), end: new Date() };
			const result = validateDateRangeIsAfterReceivedDate(datePeriod, null, label);
			assert.strictEqual(result, true);
		});

		it('should return true when receivedDate is not a Date', () => {
			const datePeriod = { start: new Date(), end: new Date() };
			const result = validateDateRangeIsAfterReceivedDate(datePeriod, 'not-a-date', label);
			assert.strictEqual(result, true);
		});

		it('should throw error when datePeriod is null', () => {
			const receivedDate = new Date('2024-01-01');
			assert.throws(() => validateDateRangeIsAfterReceivedDate(null, receivedDate, label), {
				message: 'Mock period not found'
			});
		});

		it('should throw error when datePeriod is not an object', () => {
			const receivedDate = new Date('2024-01-01');
			assert.throws(() => validateDateRangeIsAfterReceivedDate('invalid', receivedDate, label), {
				message: 'Mock period not found'
			});
		});

		it('should throw error when start date is missing', () => {
			const receivedDate = new Date('2024-01-01');
			const datePeriod = { end: new Date('2024-06-01') };
			assert.throws(() => validateDateRangeIsAfterReceivedDate(datePeriod, receivedDate, label), {
				message: 'Mock start date not found'
			});
		});

		it('should throw error when start date is not a Date', () => {
			const receivedDate = new Date('2024-01-01');
			const datePeriod = { start: 'not-a-date', end: new Date('2024-06-01') };
			assert.throws(() => validateDateRangeIsAfterReceivedDate(datePeriod, receivedDate, label), {
				message: 'Mock start date not found'
			});
		});

		it('should throw error when end date is missing', () => {
			const receivedDate = new Date('2024-01-01');
			const datePeriod = { start: new Date('2024-03-01') };
			assert.throws(() => validateDateRangeIsAfterReceivedDate(datePeriod, receivedDate, label), {
				message: 'Mock end date not found'
			});
		});

		it('should throw error when end date is not a Date', () => {
			const receivedDate = new Date('2024-01-01');
			const datePeriod = { start: new Date('2024-03-01'), end: 'not-a-date' };
			assert.throws(() => validateDateRangeIsAfterReceivedDate(datePeriod, receivedDate, label), {
				message: 'Mock end date not found'
			});
		});

		it('should throw error when start date is before received date', () => {
			const receivedDate = new Date('2024-01-15');
			const datePeriod = {
				start: new Date('2024-01-10'),
				end: new Date('2024-06-01')
			};
			assert.throws(() => validateDateRangeIsAfterReceivedDate(datePeriod, receivedDate, label), {
				message: 'Mock start date cannot be before case received date'
			});
		});

		it('should throw error when end date is before received date', () => {
			const receivedDate = new Date('2024-01-15');
			const datePeriod = {
				start: new Date('2024-02-01'),
				end: new Date('2024-01-10')
			};
			assert.throws(() => validateDateRangeIsAfterReceivedDate(datePeriod, receivedDate, label), {
				message: 'Mock end date cannot be before case received date'
			});
		});

		it('should return true when both dates are after received date', () => {
			const receivedDate = new Date('2024-01-01');
			const datePeriod = {
				start: new Date('2024-03-01'),
				end: new Date('2024-06-01')
			};
			const result = validateDateRangeIsAfterReceivedDate(datePeriod, receivedDate, label);
			assert.strictEqual(result, true);
		});

		it('should use the provided label in error messages', () => {
			const receivedDate = new Date('2024-01-01');
			const customLabel = 'Suspension';
			assert.throws(() => validateDateRangeIsAfterReceivedDate(null, receivedDate, customLabel), {
				message: 'Suspension period not found'
			});
		});
	});

	describe('validateDateIsAfterReceivedDate', () => {
		const label = 'Expiry date';

		it('should return true when receivedDate is null', () => {
			const date = new Date('2024-06-01');
			const result = validateDateIsAfterReceivedDate(date, null, label);
			assert.strictEqual(result, true);
		});

		it('should return true when receivedDate is undefined', () => {
			const date = new Date('2024-06-01');
			const result = validateDateIsAfterReceivedDate(date, undefined, label);
			assert.strictEqual(result, true);
		});

		it('should return true when receivedDate is not a Date', () => {
			const date = new Date('2024-06-01');
			const result = validateDateIsAfterReceivedDate(date, 'not-a-date', label);
			assert.strictEqual(result, true);
		});

		it('should throw error when date is null', () => {
			const receivedDate = new Date('2024-01-01');
			assert.throws(() => validateDateIsAfterReceivedDate(null, receivedDate, label), {
				message: 'Expiry date not found'
			});
		});

		it('should throw error when date is undefined', () => {
			const receivedDate = new Date('2024-01-01');
			assert.throws(() => validateDateIsAfterReceivedDate(undefined, receivedDate, label), {
				message: 'Expiry date not found'
			});
		});

		it('should throw error when date is not a Date', () => {
			const receivedDate = new Date('2024-01-01');
			assert.throws(() => validateDateIsAfterReceivedDate('not-a-date', receivedDate, label), {
				message: 'Expiry date not found'
			});
		});

		it('should throw error when date is before received date', () => {
			const receivedDate = new Date('2024-01-15');
			const date = new Date('2024-01-10');
			assert.throws(() => validateDateIsAfterReceivedDate(date, receivedDate, label), {
				message: 'Expiry date cannot be before case received date'
			});
		});

		it('should return true when date is after received date', () => {
			const receivedDate = new Date('2024-01-01');
			const date = new Date('2024-06-01');
			const result = validateDateIsAfterReceivedDate(date, receivedDate, label);
			assert.strictEqual(result, true);
		});

		it('should return true when date equals received date', () => {
			const receivedDate = new Date('2024-01-15');
			const date = new Date('2024-01-15');
			const result = validateDateIsAfterReceivedDate(date, receivedDate, label);
			assert.strictEqual(result, true);
		});

		it('should use the provided label in error messages', () => {
			const receivedDate = new Date('2024-01-01');
			const customLabel = 'Target decision date';
			assert.throws(() => validateDateIsAfterReceivedDate(null, receivedDate, customLabel), {
				message: 'Target decision date not found'
			});
		});

		it('should use the provided label in before date error message', () => {
			const receivedDate = new Date('2024-06-01');
			const date = new Date('2024-01-01');
			const customLabel = 'Decision must be issued by';
			assert.throws(() => validateDateIsAfterReceivedDate(date, receivedDate, customLabel), {
				message: 'Decision must be issued by cannot be before case received date'
			});
		});
	});
});
