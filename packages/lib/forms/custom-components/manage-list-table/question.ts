import ManageListQuestion from '@planning-inspectorate/dynamic-forms/src/components/manage-list/question.js';
import DateQuestion from '@planning-inspectorate/dynamic-forms/src/components/date/question.js';
import type {
	PreppedQuestion,
	QuestionViewModel,
	TableHeadCell,
	TableManageListQuestionParameters,
	TableRowCell
} from './types.ts';

export default class TableManageListQuestion extends ManageListQuestion {
	section: Record<string, any> | undefined;
	viewFolder: string;

	constructor(params: TableManageListQuestionParameters) {
		super(params);
		this.viewFolder = 'custom-components/manage-list-table';
	}

	/**
	 * Override to prepare table data (heads and rows)
	 */
	override addCustomDataToViewModel(viewModel: QuestionViewModel): void {
		if (!this.section) {
			throw new Error('Section not set for TableManageListQuestion');
		}

		super.addCustomDataToViewModel(viewModel);

		this.addButtonText(viewModel);

		const headers = this.createHeaders();
		const rows = this.createRows(viewModel);

		viewModel.question.tableHead = headers;
		viewModel.question.tableRows = rows;
	}

	/**
	 * Adds the text for the save, cancel and add buttons.
	 *
	 * At some point we may want to move this logic into the
	 * instantiation of the classes so that each one can have
	 * its own button text.
	 */
	private addButtonText(viewModel: QuestionViewModel): void {
		viewModel.continueButtonText = 'Save and continue';
		viewModel.addMoreButtonText = 'Add details';
		viewModel.cancelButtonText = 'Cancel';
	}

	/**
	 * Creates the table rows
	 */
	private createRows(viewModel: QuestionViewModel): TableRowCell[][] {
		const answers = viewModel.question.value || [];

		const rows = answers.map((item: Record<string, any>) => {
			return this.createRow(viewModel, item);
		});

		return rows;
	}

	/**
	 * Creates the table row based on the questions asked
	 */
	private createRow(viewModel: QuestionViewModel, item: Record<string, any>): TableRowCell[] {
		const cells = this.section?.questions.map((question: any) => {
			return this.createCell(question, item);
		});

		const actionsHtml = this.generateActionsHtml(viewModel, item);

		cells.push({ html: actionsHtml });

		return cells;
	}

	/**
	 * Creates the sortable table headers based on the question asked.
	 */
	createHeaders(): TableHeadCell[] {
		const headers = this.section?.questions.map((question: any) => ({
			text: question.viewData?.tableHeader || question.title || question.question,
			attributes: {
				'aria-sort': 'none'
			}
		}));

		headers.push({
			text: 'Actions',
			classes: 'govuk-!-width-one-quarter' // So that Actions always has enough room for its buttons
		});

		return headers;
	}

	createCell(question: PreppedQuestion, item: Record<string, any>): TableRowCell {
		const mockJourney = {
			response: { answers: item },
			getCurrentQuestionUrl: () => '',
			answers: item
		};

		if (question.shouldDisplay && !question.shouldDisplay({ answers: item })) {
			return { text: '—' };
		}

		const formatted = question.formatAnswerForSummary('', mockJourney, item[question.fieldName]);

		const cellContent = formatted.map((answer) => answer.value).join(', ');

		// Most things just sort by their cell, but dates need to be formatted into unix format (ms)
		const sortValue = question instanceof DateQuestion ? new Date(cellContent)?.getTime() : cellContent;

		return {
			html: cellContent || '-',
			classes: 'govuk-table__cell',
			attributes: {
				'data-sort-value': sortValue
			}
		};
	}

	/**
	 * Generates the HTML for the cell on the RHS that contains the two buttons
	 * for changing and removing.
	 */
	generateActionsHtml(viewModel: QuestionViewModel, item: Record<string, any>): string {
		const originalUrlTrimmed = viewModel.util.trimTrailingSlash(viewModel.originalUrl);

		const firstQuestionUrl = viewModel.question.firstQuestionUrl;
		const changeUrl = `${originalUrlTrimmed}/edit/${item.id}/${firstQuestionUrl}`;
		const removeUrl = `${originalUrlTrimmed}/remove/${item.id}/confirm`;

		const actionsHtml = `
            <ul class="govuk-summary-list__actions-list">
                <li class="govuk-summary-list__actions-list-item">
                    <a class="govuk-link" href="${changeUrl}">
                        Change<span class="govuk-visually-hidden"> row</span>
                    </a>
                </li>
                <li class="govuk-summary-list__actions-list-item">
                    <a class="govuk-link" href="${removeUrl}">
                        Remove<span class="govuk-visually-hidden"> row</span>
                    </a>
                </li>
            </ul>`;

		return actionsHtml;
	}
}
