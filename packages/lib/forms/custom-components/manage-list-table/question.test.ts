import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import TableManageListQuestion from './question.ts';
import DateQuestion from '@planning-inspectorate/dynamic-forms/src/components/date/question.js';
import type { PreppedQuestion } from './types.js';
import type { QuestionViewModel } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

describe('TableManageListQuestion', () => {
	let tableQuestion: TableManageListQuestion;
	let mockViewModel: QuestionViewModel;

	beforeEach(() => {
		tableQuestion = new TableManageListQuestion({
			title: 'Test Table',
			fieldName: 'testTable',
			titleSingular: 'Item',
			question: 'What items do you want to add?'
		} as any);

		tableQuestion.section = {
			questions: [
				{ title: 'Name', viewData: { tableHeader: 'Full Name' }, fieldName: 'name' },
				{ title: 'Date of Birth', fieldName: 'dob' }
			]
		};

		mockViewModel = {
			question: {
				value: [
					{ id: 'uuid-1', name: 'John Doe', dob: '1990-01-01' },
					{ id: 'uuid-2', name: 'Jane Doe', dob: '1985-05-15' }
				],
				firstQuestionUrl: 'name-page'
			},
			originalUrl: '/my-url/',
			util: {
				trimTrailingSlash: (url: string) => url.replace(/\/$/, '')
			}
		} as unknown as QuestionViewModel;
	});

	describe('Constructor', () => {
		it('should set the custom view folder', () => {
			assert.strictEqual(tableQuestion.viewFolder, 'custom-components/manage-list-table');
		});
	});

	describe('createHeaders()', () => {
		it('should generate headers with aria-sort and an Actions column', () => {
			const headers = tableQuestion.createHeaders();

			assert.strictEqual(headers.length, 3);

			assert.strictEqual(headers[0].text, 'Full Name');
			assert.deepStrictEqual(headers[0].attributes, { 'aria-sort': 'none' });

			assert.strictEqual(headers[1].text, 'Date of Birth');

			assert.strictEqual(headers[2].text, 'Actions');
			assert.strictEqual(headers[2].classes, 'govuk-!-width-one-quarter');
		});
	});

	describe('createCell()', () => {
		it('should return a dash if shouldDisplay returns false', () => {
			const hiddenQuestion = {
				fieldName: 'secret',
				shouldDisplay: () => false
			} as unknown as PreppedQuestion;

			const result = tableQuestion.createCell(hiddenQuestion, { secret: 'hidden' });

			assert.strictEqual(result.text, '—');
			assert.strictEqual(result.html, undefined);
		});

		it('should render standard question values with text as sort value', () => {
			const mockQuestion = {
				fieldName: 'name',
				formatAnswerForSummary: () => [{ value: 'John' }, { value: 'Doe' }]
			} as unknown as PreppedQuestion;

			const result = tableQuestion.createCell(mockQuestion, { name: 'John Doe' });

			assert.strictEqual(result.html, 'John, Doe');
			assert.strictEqual(result.classes, 'govuk-table__cell');
			assert.deepStrictEqual(result.attributes, { 'data-sort-value': 'John, Doe' });
		});

		it('should convert DateQuestion values to a unix timestamp for sorting', () => {
			const dateQuestion = new DateQuestion({
				title: 'Date',
				fieldName: 'dob',
				question: 'What is the date of birth?'
			} as any) as unknown as PreppedQuestion;

			dateQuestion.formatAnswerForSummary = () => [{ value: '1990-01-01' }] as any;

			const result = tableQuestion.createCell(dateQuestion, { dob: '1990-01-01' });

			assert.strictEqual(result.html, '1990-01-01');
			assert.strictEqual(result.attributes?.['data-sort-value'], new Date('1990-01-01').getTime());
		});
	});

	describe('generateActionsHtml()', () => {
		it('should generate correct edit and remove links with the originalUrl', () => {
			const item = { id: 'item-123' };
			const html = tableQuestion.generateActionsHtml(mockViewModel, item);

			assert.ok(html.includes('href="/my-url/edit/item-123/name-page"'));
			assert.ok(html.includes('href="/my-url/remove/item-123/confirm"'));
			assert.ok(html.includes('<span class="govuk-visually-hidden"> row</span>'));
		});
	});

	describe('addCustomDataToViewModel()', () => {
		it('should populate viewModel with tableHead, tableRows, and button text', () => {
			tableQuestion.section!.questions[0].shouldDisplay = () => true;
			tableQuestion.section!.questions[1].shouldDisplay = () => true;

			tableQuestion.section!.questions[0].formatAnswerForSummary = () => [{ value: 'Ans 1' }];
			tableQuestion.section!.questions[1].formatAnswerForSummary = () => [{ value: 'Ans 2' }];

			tableQuestion.addCustomDataToViewModel(mockViewModel);

			assert.strictEqual(mockViewModel.continueButtonText, 'Save and continue');
			assert.strictEqual(mockViewModel.addMoreButtonText, 'Add details');

			assert.strictEqual(mockViewModel.question.tableHead?.length, 3);
			assert.strictEqual(mockViewModel.question.tableRows?.length, 2);

			assert.strictEqual(mockViewModel.question.tableRows[0].length, 3);
			assert.strictEqual(mockViewModel.question.tableRows[0][0].html, 'Ans 1');
		});

		it('should throw an error if section is not set', () => {
			tableQuestion.section = undefined;

			assert.throws(() => {
				tableQuestion.addCustomDataToViewModel(mockViewModel);
			}, /manage list section not set/);
		});
	});
});
