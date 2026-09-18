process.env.ENVIRONMENT = 'dev';

import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import nunjucks from 'nunjucks';
import {
	ALL_QUESTIONS,
	camelCaseToKebabCase,
	camelCaseToSentenceCase,
	createOverviewQuestions,
	dateQuestion,
	handleOriginatorFormattingFn,
	linkedCaseSummaryFormatter,
	OVERVIEW_QUESTIONS,
	validateDateIsAfterReceivedDate,
	validateDateRangeIsAfterReceivedDate,
	validateOnlyOneLeadLinkedCase
} from './question-utils.ts';

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

	describe('validateOnlyOneLeadLinkedCase', () => {
		it('should pass validation when there are no other linked cases', () => {
			const linkedCases = [] as unknown as string[];
			const newEntry = { id: '1', isLead: 'yes' };
			assert.ok(validateOnlyOneLeadLinkedCase(newEntry.isLead, linkedCases));
		});

		it('should pass validation when isLead is no', () => {
			const linkedCases = [{ id: '1', linkedCaseIsLead: 'yes' }];
			const newEntry = { id: '2', isLead: 'no' };
			assert.ok(validateOnlyOneLeadLinkedCase(newEntry.isLead, linkedCases));
		});

		it('should pass when there is only one lead linked case', () => {
			const linkedCases = [
				{ id: '1', linkedCaseIsLead: 'no' },
				{ id: '3', linkedCaseIsLead: 'no' }
			];
			const newEntry = { id: '2', isLead: 'yes' };
			assert.ok(validateOnlyOneLeadLinkedCase(newEntry.isLead, linkedCases));
		});

		it('should error when there are more than one lead linked case', () => {
			const linkedCases = [
				{ id: '1', linkedCaseIsLead: 'yes' },
				{ id: '3', linkedCaseIsLead: 'no' }
			];
			const newEntry = { id: '2', isLead: 'yes' };
			assert.throws(
				() => validateOnlyOneLeadLinkedCase(newEntry.isLead, linkedCases),
				/There is already a linked case marked as lead./
			);
		});
	});

	describe('createOverviewQuestions', () => {
		it('should populate linkedCaseId options from other cases', () => {
			const otherCases = [
				{ id: 'case-1', reference: 'REF-001' },
				{ id: 'case-2', reference: 'REF-002' }
			];

			const result = createOverviewQuestions(OVERVIEW_QUESTIONS, {}, otherCases);

			assert.deepStrictEqual(result.linkedCaseId.options, [
				{ text: '', value: '' },
				{ text: 'REF-001', value: 'case-1' },
				{ text: 'REF-002', value: 'case-2' }
			]);
		});

		it('should default to an empty options list when no other cases are passed', () => {
			const result = createOverviewQuestions(OVERVIEW_QUESTIONS, {});

			assert.deepStrictEqual(result.linkedCaseId.options, [
				{
					text: '',
					value: ''
				}
			]);
		});
	});

	describe('linkedCaseSummaryFormatter', () => {
		const createReferenceQuestion = () => ({
			fieldName: 'linkedCaseId',
			formatAnswer: (linkedCaseId: string) => `Ref-${linkedCaseId}`
		});

		const createQuestionContext = (
			referenceQuestion: unknown,
			{ fieldName = 'linkedCaseDetails', summaryLimit = 5 } = {}
		) => ({
			fieldName,
			section: {
				questions: referenceQuestion ? [referenceQuestion] : []
			},
			summaryLimit
		});

		type RenderData = { answers: unknown[]; limit: number; uniqueId: string; enableToggle: boolean };

		let renderMock: ReturnType<typeof mock.method>;

		const getRenderCall = (callIndex = 0) =>
			renderMock.mock.calls[callIndex].arguments as unknown as [string, RenderData];

		beforeEach(() => {
			renderMock = mock.method(nunjucks, 'render', () => '<rendered-html>');
		});

		afterEach(() => {
			renderMock.mock.restore();
		});

		it('should return formattedAnswer unchanged and not render when answer has no valid rows', () => {
			const question = createQuestionContext(createReferenceQuestion());

			const result = linkedCaseSummaryFormatter({
				answer: [],
				formattedAnswer: 'Not started',
				question
			} as any);

			assert.strictEqual(result, 'Not started');
			assert.strictEqual(renderMock.mock.calls.length, 0);
		});

		it('should return formattedAnswer unchanged when answer is not an array', () => {
			const question = createQuestionContext(createReferenceQuestion());

			const result = linkedCaseSummaryFormatter({
				answer: 'not-an-array',
				formattedAnswer: 'fallback',
				question
			} as any);

			assert.strictEqual(result, 'fallback');
			assert.strictEqual(renderMock.mock.calls.length, 0);
		});

		it('should format rows using the referenceQuestion and mark the lead case', () => {
			const question = createQuestionContext(createReferenceQuestion());
			const answer = [
				{ linkedCaseId: 'case-1', linkedCaseIsLead: 'no' },
				{ linkedCaseId: 'case-2', linkedCaseIsLead: 'yes' }
			];

			linkedCaseSummaryFormatter({ answer, formattedAnswer: '', question } as any);

			assert.strictEqual(renderMock.mock.calls.length, 1);
			const [, data] = getRenderCall();
			assert.deepStrictEqual(data.answers, [[{ answer: 'Ref-case-1' }], [{ answer: 'Ref-case-2 (Lead)' }]]);
		});

		it('should fall back to the raw linkedCaseId when no reference question is found', () => {
			const question = createQuestionContext(null);
			const answer = [{ linkedCaseId: 'case-1', linkedCaseIsLead: 'no' }];

			linkedCaseSummaryFormatter({ answer, formattedAnswer: '', question } as any);

			const [, data] = getRenderCall();
			assert.deepStrictEqual(data.answers, [[{ answer: 'case-1' }]]);
		});

		it('should render with the correct template, limit and uniqueId', () => {
			const question = createQuestionContext(createReferenceQuestion(), {
				fieldName: 'linkedCaseDetails',
				summaryLimit: 3
			});
			const answer = [{ linkedCaseId: 'case-1', linkedCaseIsLead: 'no' }];

			linkedCaseSummaryFormatter({ answer, formattedAnswer: '', question } as any);

			const [template, data] = getRenderCall();
			assert.strictEqual(template, 'custom-components/manage-list-table/answer-summary-list.njk');
			assert.strictEqual(data.limit, 3);
			assert.strictEqual(data.uniqueId, 'list-linkedCaseDetails');
		});

		it('should set enableToggle to true when there are more answers than the summary limit', () => {
			const question = createQuestionContext(createReferenceQuestion(), { summaryLimit: 1 });
			const answer = [
				{ linkedCaseId: 'case-1', linkedCaseIsLead: 'no' },
				{ linkedCaseId: 'case-2', linkedCaseIsLead: 'no' }
			];

			linkedCaseSummaryFormatter({ answer, formattedAnswer: '', question } as any);

			const [, data] = getRenderCall();
			assert.strictEqual(data.enableToggle, true);
		});

		it('should set enableToggle to false when answers equal the summary limit', () => {
			const question = createQuestionContext(createReferenceQuestion(), { summaryLimit: 2 });
			const answer = [
				{ linkedCaseId: 'case-1', linkedCaseIsLead: 'no' },
				{ linkedCaseId: 'case-2', linkedCaseIsLead: 'no' }
			];

			linkedCaseSummaryFormatter({ answer, formattedAnswer: '', question } as any);

			const [, data] = getRenderCall();
			assert.strictEqual(data.enableToggle, false);
		});

		it('should return the rendered html from nunjucks', () => {
			const question = createQuestionContext(createReferenceQuestion());
			const answer = [{ linkedCaseId: 'case-1', linkedCaseIsLead: 'no' }];

			const result = linkedCaseSummaryFormatter({ answer, formattedAnswer: '', question } as any);

			assert.strictEqual(result, '<rendered-html>');
		});
	});
});
