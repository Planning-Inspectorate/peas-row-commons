declare module '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js' {
	export function questionHasAnswer(response: any, question: any, expectedValue: any): boolean;
}

declare module '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js' {
	export const BOOLEAN_OPTIONS: {
		readonly YES: 'yes';
		readonly NO: 'no';
	};

	export function yesNoToBoolean(value: any): any;
}

declare module '@planning-inspectorate/dynamic-forms/src/journey/journey.js' {
	export class Journey {
		constructor(config: any);
		response: any;
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js' {
	export declare class JourneyResponse {
		referenceId: string;
		journeyId: string;
		answers: Record<string, unknown>;
		LPACode?: string;

		constructor(journeyId: string, referenceId: string, answers: Record<string, unknown> | null, lpaCode?: string);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/questions/options-question.js' {
	import { Question, QuestionViewModel } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
	import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
	import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
	import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
	import { Request } from 'express';

	export interface ConditionalConfig {
		question: string;
		fieldName: string;
		type?: string;
		inputClasses?: string;
		html?: string;
		value?: unknown;
		label?: string;
		hint?: string;
	}

	export interface Option {
		text: string;
		value: string;
		hint?: { text: string } | object;
		checked?: boolean;
		selected?: boolean;
		attributes?: Record<string, string>;
		behaviour?: 'exclusive';
		conditional?: ConditionalConfig;
		conditionalText?: { html: string };
	}

	export interface OptionsQuestionParams {
		title: string;
		question: string;
		fieldName: string;
		options: Option[];
		url?: string;
		hint?: string;
		validators?: any[];
		editable?: boolean;
		viewFolder?: string;
		[key: string]: any;
	}

	export default class OptionsQuestion extends Question {
		options: Option[];
		optionJoinString: string;

		constructor(params: OptionsQuestionParams);

		prepQuestionForRendering(
			section: Section,
			journey: Journey,
			customViewData?: Record<string, unknown>,
			payload?: Record<string, any>
		): QuestionViewModel;

		getDataToSave(req: Request, journeyResponse: JourneyResponse): Promise<{ answers: Record<string, unknown> }>;
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/components/manage-list/question.js' {
	export default class ManageListQuestion {
		constructor(params: any);

		addCustomDataToViewModel(viewModel: any);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/components/date/question.js' {
	export default class DateQuestion {
		constructor(params: any);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/questions/question.js' {
	import { Request, Response } from 'express';
	import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
	import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
	import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';

	export interface ActionLink {
		href: string;
		text: string;
		visuallyHiddenText?: string;
	}

	export interface PreppedQuestion {
		value: any;
		question: string;
		fieldName: string;
		pageTitle: string;
		description?: string;
		html?: string;
		hint?: string;
		interfaceType?: string;
		autocomplete?: string;
		[key: string]: any;
	}

	export interface QuestionViewModel {
		question: PreppedQuestion;
		layoutTemplate: string;
		pageCaption?: string;
		navigation: string[];
		backLink: string;
		showBackToListLink: boolean;
		listLink: string;
		journeyTitle: string;
		payload?: any;
		continueButtonText: string;
		errors?: Record<string, any>;
		errorSummary?: any[];
		[key: string]: any;
	}

	export interface QuestionParameters {
		title: string;
		question: string;
		viewFolder: string;
		fieldName: string;
		url?: string;
		pageTitle?: string;
		description?: string;
		validators?: any[];
		html?: string;
		hint?: string;
		interfaceType?: string;
		shouldDisplay?: (response?: JourneyResponse) => boolean;
		autocomplete?: string;
		editable?: boolean;
		actionLink?: ActionLink;
		viewData?: Record<string, unknown>;
	}

	export interface SummaryListItem {
		key: string;
		value: string | Record<string, any>;
		action?: ActionLink | ActionLink[];
	}

	export class Question {
		pageTitle: string;
		title: string;
		question: string;
		description?: string;
		viewFolder: string;
		fieldName: string;
		taskList: boolean;
		validators: any[];
		hint?: string;
		showBackToListLink: boolean;
		url?: string;
		html?: string;
		interfaceType?: string;
		actionLink?: ActionLink;

		notStartedText: string;
		continueButtonText: string;
		changeActionText: string;
		answerActionText: string;
		addActionText: string;

		details: { title: string; text: string };
		autocomplete?: string;
		editable: boolean;
		viewData: Record<string, unknown>;

		shouldDisplay: (response?: JourneyResponse) => boolean;

		constructor(params: QuestionParameters, methodOverrides?: Record<string, any>);

		prepQuestionForRendering(
			section: Section,
			journey: Journey,
			customViewData?: Record<string, unknown>,
			payload?: unknown
		): QuestionViewModel;

		renderAction(res: Response, viewModel: QuestionViewModel): void;

		checkForValidationErrors(req: Request, sectionObj: Section, journey: Journey): QuestionViewModel | undefined;

		getDataToSave(req: Request, journeyResponse: JourneyResponse): Promise<{ answers: Record<string, unknown> }>;

		checkForSavingErrors(req: Request, sectionObj: Section, journey: Journey): QuestionViewModel | undefined;

		handleNextQuestion(res: Response, journey: Journey, sectionSegment: string, questionSegment: string): void;

		formatAnswerForSummary(
			sectionSegment: string,
			journey: Journey,
			answer: any,
			capitals?: boolean
		): SummaryListItem[];

		getAction(sectionSegment: string, journey: Journey, answer: any): ActionLink | ActionLink[] | undefined;

		format(answer: any): any;

		isRequired(): boolean;

		fieldIsRequired(inputField: string): boolean;

		isAnswered(journeyResponse: JourneyResponse, fieldName?: string): boolean;
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/section.js' {
	export class Section {
		constructor(name: string, id: string);
		addQuestion(question: any, manageSection?: any): Section;
		withCondition(condition: (response: any) => boolean): Section;
		startMultiQuestionCondition(key: string, condition: (response: any) => boolean): Section;
		endMultiQuestionCondition(key: string): Section;
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js' {
	export class ManageListSection {
		constructor();
		addQuestion(question: any, manageSection?: any): Section;
		withCondition(condition: (response: any) => boolean): Section;
		startMultiQuestionCondition(key: string, condition: (response: any) => boolean): Section;
		endMultiQuestionCondition(key: string): Section;
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js' {
	export function createQuestions(
		definitions: any,
		classes: any,
		questionMethodOverrides?: any,
		textOverrides?: any
	): any;
}

declare module '@planning-inspectorate/dynamic-forms/src/questions/questions.js' {
	export const questionClasses: any;
}

declare module '@planning-inspectorate/dynamic-forms' {
	export const COMPONENT_TYPES: any;
}

declare module '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js' {
	export default class RequiredValidator {
		constructor(message: string);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/validator/conditional-required-validator.js' {
	export default class ConditionalRequiredValidator {
		constructor(message: string);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js' {
	export default class StringValidator {
		constructor(options: any);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js' {
	export default class DateValidator {
		constructor(options: any);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/validator/address-validator.js' {
	export default class AddressValidator {
		constructor(options?: any);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/validator/numeric-validator.js' {
	export default class NumericValidator {
		constructor(options: any);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/validator/multi-field-input-validator.js' {
	export default class MultiFieldInputValidator {
		constructor(options: any);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/middleware/build-get-journey.js' {
	export function buildGetJourney(createJourney: any): any;
}

declare module '@planning-inspectorate/dynamic-forms/src/controller.js' {
	export function buildSave(saveFunction: any, redirectToTaskListOnSuccess?: boolean): any;
	export function list(req: any, res: any, template?: string, options?: any): any;
	export function question(req: any, res: any, next?: any): any;
}

declare module '@planning-inspectorate/dynamic-forms/src/validator/validator.js' {
	const validate: any;
	export default validate;
}

declare module '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js' {
	export function validationErrorHandler(req: any, res: any, next: any): any;
}

declare module '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js' {
	export function buildGetJourneyResponseFromSession(journeyId: string, sessionKey?: string): any;
	export function buildSaveDataToSession(options?: any): any;
	export function saveDataToSession(options?: any): any;
	export function clearDataFromSession(options: {
		req: any;
		journeyId: string;
		replaceWith?: Record<string, any>;
		reqParam?: any;
	}): any;
}

declare module '@planning-inspectorate/dynamic-forms/src/middleware/redirect-to-unanswered-question.js' {
	export function redirectToUnansweredQuestion(options?: {
		journeyResponseKey?: string;
		journeyKey?: string;
	}): (req: any, res: any, next: any) => void;
}

declare module '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js' {
	export class JourneyResponse {
		referenceId: string;
		journeyId: JourneyType;
		answers: Record<string, unknown>;
		constructor(journeyId: JourneyType, referenceId: string, answers: Record<string, unknown> | null);
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js' {
	export function booleanToYesNoValue(value: any): any;
}

declare module '@planning-inspectorate/dynamic-forms/src/components/date-time/question.js' {
	export default class DateTimeQuestion {
		fieldName: any;
		dateFormat: any;
		timeFormat: any;
		title: any;
		getAction(sectionSegment: any, journey: any, answer: any): any;
		prepQuestionForRendering(section: any, journey: any, customViewData: any, payload: any): any;
		async getDataToSave(req: any, journeyResponse: any): any;
		formatAnswerForSummary(sectionSegment: any, journey: any, answer: any): any;
	}
}

declare module '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js' {
	export function parseDateInput(params: any): any;
	export function formatDateForDisplay(date: any, params: any): any;
}
