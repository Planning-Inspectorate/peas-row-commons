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

export interface TableManageListQuestionView {
	value: Record<string, unknown>[];
	question: string;
	fieldName: string;
	pageTitle: string;
	firstQuestionUrl?: string;
	tableHead?: TableHeadCell[];
	tableRows?: TableRowCell[][];
}
