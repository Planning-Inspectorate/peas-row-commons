import type {
	Journey,
	JourneyResponse,
	ManageListQuestionParams,
	Question,
	QuestionViewModel,
	RouteParams,
	Section
} from '@planning-inspectorate/dynamic-forms';
import { DateQuestion, JourneyForDisplay, ManageListQuestion } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import nunjucks from 'nunjucks';
import type { TableHeadCell, TableManageListQuestionView, TableRowCell } from './types.ts';

export interface TableManageListQuestionParams extends ManageListQuestionParams {
	summaryLimit?: number;
	hideRemoveOnLastItem?: boolean;
	/**
	 * When set, adds an extra leading column whose cells show
	 * `${indexColumnHeader} ${rowIndex + 1}`, numbering each row in the
	 * table. Only affects the table view, not the showAnswersInSummary list.
	 */
	indexColumnHeader?: string;
}

export interface TableManageListQuestionProps extends TableManageListQuestionParams {
	type: 'table-manage-list';
}

export default class TableManageListQuestion extends ManageListQuestion {
	viewFolder: string;
	summaryLimit: number;
	showAnswersInSummary: boolean;
	hideRemoveOnLastItem: boolean;
	indexColumnHeader?: string;

	constructor(params: TableManageListQuestionParams) {
		super(params);

		this.summaryLimit = params.summaryLimit || 2;
		this.showAnswersInSummary = params.showAnswersInSummary || false;
		this.hideRemoveOnLastItem = params.hideRemoveOnLastItem || false;
		this.indexColumnHeader = params.indexColumnHeader;

		this.viewFolder = 'custom-components/manage-list-table';
	}

	/**
	 * Override for parent.
	 *
	 * Only difference is that for payload we pass in the journey response answers.
	 * This is because for Manage List questions, we don't have the data
	 * stored in the body from an input like a regular question, so body
	 * does not contain anything useful and it won't repopulate the screen.
	 */
	checkForValidationErrors(
		req: Request,
		section: Section,
		journey: Journey,
		manageListQuestion?: ManageListQuestion
	): QuestionViewModel | undefined {
		const { body = {}, originalUrl } = req;
		const { errors = {}, errorSummary = [] } = body;

		if (Object.keys(errors).length > 0) {
			return this.toViewModel({
				params: req.params as RouteParams,
				section,
				journey,
				customViewData: {
					errors,
					errorSummary,
					originalUrl
				},
				// Use stored answers instead of body for Manage List repopulation
				payload: journey.response.answers,
				manageListQuestion
			});
		}
	}

	/**
	 * Override to prepare table data (heads and rows)
	 */
	override addCustomDataToViewModel(viewModel: QuestionViewModel<TableManageListQuestionView>): void {
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
	private addButtonText(viewModel: QuestionViewModel<TableManageListQuestionView>): void {
		viewModel.continueButtonText = this.viewData?.continueOnly ? 'Continue' : 'Save and continue';
		viewModel.addMoreButtonText = 'Add details';
		viewModel.cancelButtonText = 'Cancel';
	}

	/**
	 * Creates the table rows
	 */
	private createRows(viewModel: QuestionViewModel<TableManageListQuestionView>): TableRowCell[][] {
		const answers = viewModel.question.value || [];

		return answers.map((item, index) => {
			return this.createRow(viewModel, item, index);
		});
	}

	/**
	 * Creates the table row based on the questions asked
	 */
	protected createRow(
		viewModel: QuestionViewModel<TableManageListQuestionView>,
		item: Record<string, unknown>,
		index: number = 0
	): TableRowCell[] {
		const cells = this.section?.questions.map((question: Question) => {
			return this.createCell(question, item);
		});

		const indexCell = this.createIndexCell(index);
		if (indexCell) {
			cells.unshift(indexCell);
		}

		const actionsHtml = this.generateActionsHtml(viewModel, item);

		cells.push({ html: actionsHtml });

		return cells;
	}

	/**
	 * Creates the sortable table headers based on the question asked.
	 */
	createHeaders(): TableHeadCell[] {
		const headers = this.section?.questions.map((question: Question) => ({
			text: question.viewData?.tableHeader || question.title || question.question,
			attributes: {
				'aria-sort': 'none'
			}
		})) as unknown as TableHeadCell[];

		const indexHeader = this.createIndexHeaderCell();
		if (indexHeader) {
			headers.unshift(indexHeader);
		}

		headers.push({
			text: 'Actions',
			classes: 'govuk-!-width-one-quarter' // So that Actions always has enough room for its buttons
		});

		return headers;
	}

	/**
	 * When `indexColumnHeader` is set, builds the head cell for the leading
	 * numbering column. Sortable like the other columns.
	 */
	protected createIndexHeaderCell(): TableHeadCell | undefined {
		if (!this.indexColumnHeader) {
			return undefined;
		}

		return {
			text: this.indexColumnHeader,
			attributes: {
				'aria-sort': 'none'
			}
		};
	}

	/**
	 * When `indexColumnHeader` is set, builds the row cell for the leading
	 * numbering column. `index` is 0-based; displayed and sorted as 1-based.
	 */
	protected createIndexCell(index: number): TableRowCell | undefined {
		if (!this.indexColumnHeader) {
			return undefined;
		}

		const rowNumber = index + 1;

		return {
			text: `${this.indexColumnHeader} ${rowNumber}`,
			classes: 'govuk-table__cell',
			attributes: {
				'data-sort-value': rowNumber
			}
		};
	}

	createCell(question: Question, item: Record<string, unknown>): TableRowCell {
		const mockJourney = new JourneyForDisplay(item);

		if (question.shouldDisplay && !question.shouldDisplay({ answers: item } as JourneyResponse)) {
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
	generateActionsHtml(
		viewModel: QuestionViewModel<TableManageListQuestionView>,
		item: Record<string, unknown>
	): string {
		const originalUrlTrimmed =
			typeof viewModel.originalUrl === 'string' ? viewModel.util.trimTrailingSlash(viewModel.originalUrl) : '';

		const firstQuestionUrl = viewModel.question.firstQuestionUrl;
		const changeUrl = `${originalUrlTrimmed}/edit/${item.id}/${firstQuestionUrl}`;
		const removeUrl = `${originalUrlTrimmed}/remove/${item.id}/confirm`;

		// Some lists need to have at least 1 answer, so we hide the remove button if that is the case
		const removeHtml =
			viewModel?.question?.value?.length === 1 && this.hideRemoveOnLastItem
				? ''
				: `
					<li class="govuk-summary-list__actions-list-item">
						<a class="govuk-link" href="${removeUrl}">
							Remove<span class="govuk-visually-hidden"> row</span>
						</a>
					</li>
				`;

		return `
            <ul class="govuk-summary-list__actions-list">
                <li class="govuk-summary-list__actions-list-item">
                    <a class="govuk-link" href="${changeUrl}">
                        Change<span class="govuk-visually-hidden"> row</span>
                    </a>
                </li>
				${removeHtml}
            </ul>`;
	}
	/**
	 * Overrides parent. Behaves in a very similar way but as unique functionality for passing in a
	 * limit into the nunjucks, allowing for a UI toggle to hide and show items.
	 */
	override formatAnswer(answer: Record<string, unknown>[] | null): string {
		const notStartedText = this.notStartedText || 'Not started';

		if (answer && Array.isArray(answer) && answer.length) {
			if (this.showAnswersInSummary) {
				const answers = answer.map((a) => this.formatItemAnswers(a));
				const uniqueId = `list-${Math.floor(Math.random() * 100000)}`;

				return nunjucks.render('custom-components/manage-list-table/answer-summary-list.njk', {
					answers,
					limit: this.summaryLimit,
					uniqueId,
					enableToggle: answers.length > this.summaryLimit
				});
			}

			return `${answer.length} ${this.title}`;
		}

		return notStartedText;
	}

	/**
	 * Formats items to display in a list. Functionality very similar to parent.
	 */
	protected formatItemAnswers(answer: Record<string, unknown>) {
		if (!this.section || !this.section.questions || this.section.questions.length === 0) {
			return [];
		}

		const mockJourney = new JourneyForDisplay(answer);

		return this.section.questions
			.filter((q: Question) => (q.shouldDisplay ? q.shouldDisplay({ answers: answer } as JourneyResponse) : true))
			.map((q: Question) => {
				const formatted = q
					.formatAnswerForSummary('', mockJourney, answer[q.fieldName])
					.map((a) => a.value)
					.join(', ');

				return {
					question: q.title,
					answer: formatted
				};
			});
	}

	/**
	 * For this manage list item, if it is an array and that array is empty then just super to the parent
	 * with null so it displays the correct text.
	 */
	getAction(sectionSegment: string, journey: Journey, answer: Record<string, unknown>[] | null) {
		if (answer && Array.isArray(answer) && !answer.length) {
			return super.getAction(sectionSegment, journey, null);
		}

		return super.getAction(sectionSegment, journey, answer);
	}
}
