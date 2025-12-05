declare module '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js' {
	export function questionHasAnswer(response: any, question: any, expectedValue: any): boolean;
}

declare module '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js' {
	export const BOOLEAN_OPTIONS: {
		readonly YES: 'yes';
		readonly NO: 'no';
	};
}

declare module '@planning-inspectorate/dynamic-forms/src/journey/journey.js' {
	export class Journey {
		constructor(config: any);
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

declare module '@planning-inspectorate/dynamic-forms/src/section.js' {
	export class Section {
		constructor(name: string, id: string);
		addQuestion(question: any): Section;
		withCondition(condition: (response: any) => boolean): Section;
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
