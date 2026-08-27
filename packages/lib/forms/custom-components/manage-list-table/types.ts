import type { BaseQuestionViewData, ManageListQuestionParams } from '@planning-inspectorate/dynamic-forms';

export interface TableHeadCell {
	text?: string;
	html?: string;
	format?: string;
	classes?: string;
	colspan?: number;
	rowspan?: number;
	attributes?: Record<string, any>;
}

export interface TableRowCell {
	text?: string;
	html?: string;
	format?: string;
	classes?: string;
	colspan?: number;
	rowspan?: number;
	attributes?: Record<string, any>;
}

export type TableManageListQuestionParameters = ManageListQuestionParams & {
	summaryLimit?: number;
	hideRemoveOnLastItem?: boolean;
};

export interface TableManageListQuestionView extends BaseQuestionViewData {
	value: Record<string, unknown>[];
	firstQuestionUrl?: string;
	tableHead?: TableHeadCell[];
	tableRows?: TableRowCell[][];
}
