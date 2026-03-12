import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import TableManageListQuestion from './question.ts';
import DateQuestion from '@planning-inspectorate/dynamic-forms/src/components/date/question.js';
import type {
	ActionLink,
	Question,
	QuestionViewModel,
	SummaryListItem
} from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';

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
		} as unknown as Section;

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
			} as unknown as Question;

			const result = tableQuestion.createCell(hiddenQuestion, { secret: 'hidden' });

			assert.strictEqual(result.text, '—');
			assert.strictEqual(result.html, undefined);
		});

		it('should render standard question values with text as sort value', () => {
			const mockQuestion = {
				fieldName: 'name',
				formatAnswerForSummary: () => [{ value: 'John' }, { value: 'Doe' }]
			} as unknown as Question;

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
			} as any) as unknown as Question;

			dateQuestion.formatAnswerForSummary = () => [{ value: '1990-01-01' }] as any;

			const result = tableQuestion.createCell(dateQuestion, { dob: '1990-01-01' });

			assert.strictEqual(result.html, '1990-01-01');
			assert.strictEqual(result.attributes?.['data-sort-value'], new Date('1990-01-01').getTime());
		});
	});

	describe('generateActionsHtml()', () => {
		it('should generate correct edit and remove links with the originalUrl by default', () => {
			const item = { id: 'item-123' };
			const html = tableQuestion.generateActionsHtml(mockViewModel, item);

			assert.ok(html.includes('href="/my-url/edit/item-123/name-page"'));
			assert.ok(html.includes('href="/my-url/remove/item-123/confirm"'));
			assert.ok(html.includes('Change<span class="govuk-visually-hidden"> row</span>'));
			assert.ok(html.includes('Remove<span class="govuk-visually-hidden"> row</span>'));
		});

		it('should hide the remove link if hideRemoveOnLastItem is true and there is only 1 item left', () => {
			tableQuestion.hideRemoveOnLastItem = true;
			mockViewModel.question.value = [{ id: 'uuid-1', name: 'John Doe', dob: '1990-01-01' }];

			const item = { id: 'uuid-1' };
			const html = tableQuestion.generateActionsHtml(mockViewModel, item);

			assert.ok(html.includes('href="/my-url/edit/uuid-1/name-page"'));
			assert.strictEqual(html.includes('href="/my-url/remove/uuid-1/confirm"'), false);
			assert.strictEqual(html.includes('Remove<span class="govuk-visually-hidden"> row</span>'), false);
		});

		it('should display the remove link if hideRemoveOnLastItem is true but there are multiple items', () => {
			tableQuestion.hideRemoveOnLastItem = true;

			const item = { id: 'uuid-1' };
			const html = tableQuestion.generateActionsHtml(mockViewModel, item);

			assert.ok(html.includes('href="/my-url/remove/uuid-1/confirm"'));
		});

		it('should display the remove link if there is only 1 item left but hideRemoveOnLastItem is false', () => {
			tableQuestion.hideRemoveOnLastItem = false;
			mockViewModel.question.value = [{ id: 'uuid-1', name: 'John Doe', dob: '1990-01-01' }];

			const item = { id: 'uuid-1' };
			const html = tableQuestion.generateActionsHtml(mockViewModel, item);

			assert.ok(html.includes('href="/my-url/remove/uuid-1/confirm"'));
		});
	});

	describe('addCustomDataToViewModel()', () => {
		it('should populate viewModel with tableHead, tableRows, and button text', () => {
			tableQuestion.section!.questions[0].shouldDisplay = () => true;
			tableQuestion.section!.questions[1].shouldDisplay = () => true;

			tableQuestion.section!.questions[0].formatAnswerForSummary = () => [{ value: 'Ans 1' } as SummaryListItem];
			tableQuestion.section!.questions[1].formatAnswerForSummary = () => [{ value: 'Ans 2' } as SummaryListItem];

			tableQuestion.addCustomDataToViewModel(mockViewModel);

			assert.strictEqual(mockViewModel.continueButtonText, 'Save and continue');
			assert.strictEqual(mockViewModel.addMoreButtonText, 'Add details');

			assert.strictEqual(mockViewModel.question.tableHead?.length, 3);
			assert.strictEqual(mockViewModel.question.tableRows?.length, 2);

			assert.strictEqual(mockViewModel.question.tableRows[0].length, 3);
			assert.strictEqual(mockViewModel.question.tableRows[0][0].html, 'Ans 1');
		});

		it('should throw an error if section is not set', () => {
			tableQuestion.section = undefined as unknown as Section;

			assert.throws(() => {
				tableQuestion.addCustomDataToViewModel(mockViewModel);
			}, /manage list section not set/);
		});
	});

	describe('formatAnswerForSummary()', () => {
		it('should return notStartedText when answer is an empty array', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;
			tableQuestion.notStartedText = 'Not started yet';

			const result = tableQuestion.formatAnswerForSummary('segment', mockJourney, []);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].value, 'Not started yet');
		});

		it('should return notStartedText when answer is null', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;
			tableQuestion.notStartedText = 'No items added';

			const result = tableQuestion.formatAnswerForSummary('segment', mockJourney, null);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].value, 'No items added');
		});
	});

	describe('getAction()', () => {
		it('should return an action with "Add" text when the answer array is empty', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;

			const result = tableQuestion.getAction('segment', mockJourney, []) as ActionLink;

			assert.strictEqual(result?.text, 'Answer');
			assert.strictEqual(result?.visuallyHiddenText, 'What items do you want to add?');
		});

		it('should return an action with "Change" text when the answer array has items', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;

			const result = tableQuestion.getAction('segment', mockJourney, [{ id: '123' }]) as ActionLink;

			assert.strictEqual(result?.text, 'Change');
			assert.strictEqual(result?.visuallyHiddenText, 'What items do you want to add?');
		});

		it('should return an action with "Add" text when the answer is null', () => {
			const mockJourney = {
				getCurrentQuestionUrl: () => '/current-url'
			} as unknown as Journey;

			const result = tableQuestion.getAction('segment', mockJourney, null) as ActionLink;

			assert.strictEqual(result?.text, 'Answer');
			assert.strictEqual(result?.visuallyHiddenText, 'What items do you want to add?');
		});
	});
});
