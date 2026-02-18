import TableManageListQuestion from '../question.ts';
import DateQuestion from '@planning-inspectorate/dynamic-forms/src/components/date/question.js';
import type { QuestionViewModel, TableHeadCell, TableRowCell } from '../types.ts';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';

export interface TableColumn {
	header: string;
	fieldName: string;
	format?: (value: any, rowData: Record<string, any>, params: { getQuestion: any; mockJourney: any }) => string;
	sortType?: 'date' | 'string' | 'number';
}

export interface DefinedColumnsTableParams {
	[key: string]: any;
	columns: TableColumn[];
}

/**
 * Similar to TableManageListQuestion, but importantly receives a parameter:
 * "columns" and uses those as the columns for the table.
 *
 * Each column could be a defined field, as normal, or could have a format() function
 * that allows for any data or combination of data.
 */
export default class DefinedColumnsTableQuestion extends TableManageListQuestion {
	columns: TableColumn[];

	constructor(params: DefinedColumnsTableParams) {
		super(params as any);
		this.columns = params.columns;
	}

	/**
	 * Creates headers based on the passed in columns parameter.
	 */
	override createHeaders(): TableHeadCell[] {
		const headers = this.columns.map((col) => ({
			text: col.header,
			attributes: {
				'aria-sort': 'none'
			}
		})) as TableHeadCell[];

		headers.push({
			text: 'Actions',
			classes: 'govuk-!-width-one-quarter'
		});

		return headers;
	}

	/**
	 * Creates each row.
	 */
	override createRow(viewModel: QuestionViewModel, item: Record<string, any>): TableRowCell[] {
		const cells = this.columns.map((col) => {
			const linkedQuestion = this.section?.questions?.find((q: Question) => q.fieldName === col.fieldName);

			const cellContent = this.getFormattedColumnValue(col, item, linkedQuestion);

			const rawValue = item[col.fieldName];

			const sortValue = this.handleSorting(cellContent, col, linkedQuestion, rawValue);

			return {
				html: cellContent || '-',
				classes: 'govuk-table__cell',
				attributes: {
					'data-sort-value': sortValue
				}
			};
		}) as TableRowCell[];

		const actionsHtml = this.generateActionsHtml(viewModel, item);
		cells.push({ html: actionsHtml });

		return cells;
	}

	/**
	 * Sorts by string, unless item is a date or column is specified as a date, in which case
	 * we need to do some conversion
	 */
	handleSorting(cellContent: string, col: TableColumn, linkedQuestion: Question, rawValue: string) {
		let sortValue: string | number = cellContent;

		if (col.sortType === 'date' && rawValue) {
			sortValue = new Date(rawValue).getTime();
		} else if (linkedQuestion instanceof DateQuestion) {
			sortValue = new Date(cellContent)?.getTime();
		}

		return sortValue;
	}

	override formatItemAnswers(answer: Record<string, unknown>) {
		if (!this.columns || this.columns.length === 0) {
			return [];
		}

		return this.columns.map((col) => {
			const linkedQuestion = this.section?.questions?.find((q: Question) => q.fieldName === col.fieldName);
			const formatted = this.getFormattedColumnValue(col, answer, linkedQuestion);

			return {
				question: col.header,
				answer: formatted || '-'
			};
		});
	}

	/**
	 * Priority: explicit custom formatter -> question's own formatter -> raw value
	 */
	private getFormattedColumnValue(col: TableColumn, item: Record<string, any>, linkedQuestion?: Question): string {
		const rawValue = item[col.fieldName];

		const mockJourney = {
			response: { answers: item },
			getCurrentQuestionUrl: () => '',
			answers: item
		} as Journey;

		const getQuestion = (fieldName: string) =>
			this.section?.questions?.find((q: Question) => q.fieldName === fieldName);

		if (col.format) {
			return col.format(rawValue, item, { mockJourney, getQuestion });
		}

		if (linkedQuestion) {
			if (linkedQuestion.shouldDisplay && !linkedQuestion.shouldDisplay({ answers: item } as JourneyResponse)) {
				return '—';
			}

			const formattedArray = linkedQuestion.formatAnswerForSummary('', mockJourney, rawValue);
			return formattedArray.map((a: any) => a.value).join(', ');
		}

		return rawValue ?? '-';
	}
}
