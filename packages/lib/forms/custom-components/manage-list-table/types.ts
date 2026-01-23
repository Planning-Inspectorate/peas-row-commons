import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';

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

export interface TableManageListQuestionParameters {
	titleSingular?: string;
	showManageListQuestions?: boolean;
	showAnswersInSummary?: boolean;
}

export interface PreppedQuestion {
	value: Record<string, any>;
	question: string;
	fieldName: string;
	pageTitle: string;
	description?: string;
	html?: string;
	firstQuestionUrl?: string;
	shouldDisplay?: (params: { answers: Record<string, any> }) => boolean;
	formatAnswerForSummary: (
		sectionSegment: string,
		journey: Journey,
		answer: any
	) => Array<{ key: string; value: string; action?: any }>;
	tableHead?: TableHeadCell[];
	tableRows?: TableRowCell[][];
}

export interface QuestionViewModel extends Record<string, any> {
	question: PreppedQuestion;
	layoutTemplate: string;
	pageCaption: string;
	continueButtonText?: string;
	backLink: string;
	showBackToListLink: boolean;
	listLink: string;
	util: {
		trimTrailingSlash: (url: string) => string;
	};
}
