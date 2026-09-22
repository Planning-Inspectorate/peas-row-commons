process.env.ENVIRONMENT = 'dev';

import { ManageListCrossFieldValidator } from '@pins/peas-row-commons-lib/validators/manage-list-cross-field-validator.ts';
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
	validateLeadCaseNotAlreadyLinked,
	validateOnlyOneLeadLinkedCase,
	validateUniqueLinkedCaseId
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
		it('should pass validation when there are no linked cases', () => {
			const linkedCases = [] as unknown as string[];
			assert.ok(validateOnlyOneLeadLinkedCase(linkedCases));
		});

		it('should pass validation when no lead cases', () => {
			const linkedCases = [{ id: '1', linkedCaseIsLead: 'no' }];
			assert.ok(validateOnlyOneLeadLinkedCase(linkedCases));
		});

		it('should pass when there is only one lead linked case', () => {
			const linkedCases = [
				{ id: '1', linkedCaseIsLead: 'yes' },
				{ id: '2', linkedCaseIsLead: 'no' }
			];
			assert.ok(validateOnlyOneLeadLinkedCase(linkedCases));
		});

		it('should error when there are more than one lead linked case', () => {
			const linkedCases = [
				{ id: '1', linkedCaseIsLead: 'yes' },
				{ id: '3', linkedCaseIsLead: 'yes' }
			];
			assert.throws(() => validateOnlyOneLeadLinkedCase(linkedCases), /You cannot save with more than 1 lead case/);
		});
	});

	describe('validateUniqueLinkedCaseId', () => {
		it('should pass validation when there are no other linked cases', () => {
			const linkedCases = [] as unknown as string[];
			assert.ok(validateUniqueLinkedCaseId('case-1', linkedCases));
		});

		it('should pass validation when no linkedCaseId is provided', () => {
			const linkedCases = [{ id: '1', linkedCaseId: 'case-1' }];
			assert.ok(validateUniqueLinkedCaseId(undefined, linkedCases));
		});

		it('should pass validation when linkedCaseId is not already in the list', () => {
			const linkedCases = [
				{ id: '1', linkedCaseId: 'case-1' },
				{ id: '3', linkedCaseId: 'case-3' }
			];
			assert.ok(validateUniqueLinkedCaseId('case-2', linkedCases));
		});

		it('should throw error when linkedCaseId is already in the list', () => {
			const linkedCases = [
				{ id: '1', linkedCaseId: 'case-1' },
				{ id: '3', linkedCaseId: 'case-2' }
			];
			assert.throws(
				() => validateUniqueLinkedCaseId('case-2', linkedCases),
				/This case has already been added as a linked case./
			);
		});
	});

	describe('validateLeadCaseNotAlreadyLinked', () => {
		it('should pass when there is no current item and no existing lead conflicts', () => {
			const existingLeadCaseMap = new Map([['case-X', 'case-Y']]);
			assert.ok(validateLeadCaseNotAlreadyLinked('yes', [], undefined, existingLeadCaseMap, 'case-A', 'case-A'));
		});

		it('should pass when the selected case has no existing lead case', () => {
			const existingLeadCaseMap = new Map<string, string>();
			assert.ok(
				validateLeadCaseNotAlreadyLinked('yes', [], { linkedCaseId: 'case-X' }, existingLeadCaseMap, 'case-A', 'case-A')
			);
		});

		it('should pass when the selected case is already linked to the current case', () => {
			const existingLeadCaseMap = new Map([['case-X', 'case-A']]);
			assert.ok(
				validateLeadCaseNotAlreadyLinked('yes', [], { linkedCaseId: 'case-X' }, existingLeadCaseMap, 'case-A', 'case-A')
			);
		});

		it('should throw when adding an existing lead case as a non-lead row', () => {
			// case-B is itself an existing lead (maps to itself); adding it without marking
			// it lead would implicitly make case-A the lead instead.
			const existingLeadCaseMap = new Map([['case-B', 'case-B']]);
			assert.throws(
				() =>
					validateLeadCaseNotAlreadyLinked(
						'no',
						[],
						{ linkedCaseId: 'case-B' },
						existingLeadCaseMap,
						'case-A',
						'case-A'
					),
				/This case is already a lead case to other cases/
			);
		});

		it('should throw when adding an existing child of another case as a non-lead row', () => {
			// case-C already has an existing lead (case-B); adding it without marking any
			// row lead would implicitly make case-A the lead instead.
			const existingLeadCaseMap = new Map([['case-C', 'case-B']]);
			assert.throws(
				() =>
					validateLeadCaseNotAlreadyLinked(
						'no',
						[],
						{ linkedCaseId: 'case-C' },
						existingLeadCaseMap,
						'case-A',
						'case-A'
					),
				/This case is already linked to a different lead case/
			);
		});

		it('should throw when the row being edited is marked lead but the selected case already has a different lead', () => {
			const existingLeadCaseMap = new Map([['case-C', 'case-B']]);
			assert.throws(
				() =>
					validateLeadCaseNotAlreadyLinked(
						'yes',
						[],
						{ linkedCaseId: 'case-C' },
						existingLeadCaseMap,
						'case-A',
						'case-A'
					),
				/This case is already linked to a different lead case/
			);
		});

		it('should pass when adding an existing lead case and marking it as the new lead', () => {
			const existingLeadCaseMap = new Map([['case-B', 'case-B']]);
			assert.ok(
				validateLeadCaseNotAlreadyLinked('yes', [], { linkedCaseId: 'case-B' }, existingLeadCaseMap, 'case-A', 'case-A')
			);
		});

		it('should check other already-saved rows in linkedCaseDetails too, not just the current item', () => {
			const existingLeadCaseMap = new Map([['case-C', 'case-B']]);
			const linkedCaseDetails = [{ linkedCaseId: 'case-C', linkedCaseIsLead: 'no' }];
			assert.throws(
				() =>
					validateLeadCaseNotAlreadyLinked(
						'no',
						linkedCaseDetails,
						{ linkedCaseId: 'case-D' },
						existingLeadCaseMap,
						'case-A',
						'case-A'
					),
				/This case is already linked to a different lead case/
			);
		});

		it('should pass when reassigning the lead within a group the current case already belongs to', () => {
			// case-B is being edited; it's already a child of case-A (its existing group
			// lead). Re-adding sibling case-A as a plain (non-lead) row - because case-B
			// itself is becoming the new lead - shouldn't be blocked just because case-A
			// is still recorded as an existing lead of that same group.
			const existingLeadCaseMap = new Map([
				['case-A', 'case-A'],
				['case-C', 'case-A']
			]);
			assert.ok(
				validateLeadCaseNotAlreadyLinked(
					'no',
					[{ linkedCaseId: 'case-C', linkedCaseIsLead: 'no' }],
					{ linkedCaseId: 'case-A' },
					existingLeadCaseMap,
					'case-B',
					'case-A'
				)
			);
		});

		it('should still throw when pulling in a case from a genuinely different group', () => {
			// case-B's existing group lead is case-A, but case-D belongs to an unrelated
			// group led by case-Z - adding it in shouldn't be silently allowed.
			const existingLeadCaseMap = new Map([['case-D', 'case-Z']]);
			assert.throws(
				() =>
					validateLeadCaseNotAlreadyLinked(
						'no',
						[],
						{ linkedCaseId: 'case-D' },
						existingLeadCaseMap,
						'case-B',
						'case-A'
					),
				/This case is already linked to a different lead case/
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

		it('should attach a ManageListCrossFieldValidator wired to validateLeadCaseNotAlreadyLinked', () => {
			const otherCases = [{ id: 'case-2', reference: 'REF-002', ParentRelationship: { parentCaseId: 'case-lead' } }];

			const result = createOverviewQuestions(OVERVIEW_QUESTIONS, { id: 'case-1' }, otherCases);

			const crossFieldValidators = result.isLead.validators.filter(
				(validator) => validator instanceof ManageListCrossFieldValidator
			) as ManageListCrossFieldValidator[];
			const addedValidator = crossFieldValidators[crossFieldValidators.length - 1];

			assert.ok(addedValidator, 'expected a ManageListCrossFieldValidator to be attached');
			assert.strictEqual(addedValidator.dependencyFieldName, 'linkedCaseDetails');
			assert.throws(
				() => addedValidator.validationFunction('yes', [], { linkedCaseId: 'case-2' }),
				/This case is already linked to a different lead case/
			);
		});

		it('should allow reassigning the lead within a group the current case already belongs to', () => {
			// case-1 (the case being edited) is already a child of case-lead, alongside
			// sibling case-2. Re-adding case-2 as a plain row while case-1 becomes the new
			// lead shouldn't be blocked just because case-2's `ParentRelationship` still
			// points at the old lead.
			const otherCases = [{ id: 'case-2', reference: 'REF-002', ParentRelationship: { parentCaseId: 'case-lead' } }];
			const answers = {
				id: 'case-1',
				linkedCaseDetails: [{ linkedCaseId: 'case-lead', linkedCaseIsLead: 'yes' }]
			};

			const result = createOverviewQuestions(OVERVIEW_QUESTIONS, answers, otherCases);

			const crossFieldValidators = result.isLead.validators.filter(
				(validator) => validator instanceof ManageListCrossFieldValidator
			) as ManageListCrossFieldValidator[];
			const addedValidator = crossFieldValidators[crossFieldValidators.length - 1];

			assert.ok(addedValidator.validationFunction('no', [], { linkedCaseId: 'case-2' }));
		});

		it('should still include the original isLead validators', () => {
			const originalValidatorCount = OVERVIEW_QUESTIONS.isLead.validators.length;

			const result = createOverviewQuestions(OVERVIEW_QUESTIONS, { id: 'case-1' });

			assert.strictEqual(result.isLead.validators.length, originalValidatorCount + 1);
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
