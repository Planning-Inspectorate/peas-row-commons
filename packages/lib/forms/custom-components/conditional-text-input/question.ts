import type {
	Journey,
	PrepQuestionForRenderingOptions,
	QuestionViewModel,
	RadioQuestionParams,
	Section,
	SelectableOption
} from '@planning-inspectorate/dynamic-forms';
import { OptionsQuestion } from '@planning-inspectorate/dynamic-forms';
import escape from 'escape-html';
import type { Request } from 'express';

type NarrowedConditional = Omit<NonNullable<SelectableOption['conditional']>, 'type'> & {
	type?: 'textarea' | 'text';
};

/**
 * Author-facing option shape: same as the library's `SelectableOption`, but with a
 * simplified `conditional` config (author only needs to provide `question` + `fieldName`,
 * `type` defaults to 'textarea'). This is transformed into a real `SelectableOption` in the
 * constructor before being passed to the base `OptionsQuestion`.
 */
type OptionWithCondition = Omit<SelectableOption, 'conditional'> & {
	conditional?: NarrowedConditional;
};

/**
 * This component is essentially a RadioQuestion with different handling of conditional data structure.
 * TODO HRP-653 deprecate this for RadioQuestion
 */
export type ConditionalOptionsQuestionParams = Omit<RadioQuestionParams, 'options'> & {
	options: OptionWithCondition[];
};

export interface ConditionalOptionsQuestionProps extends ConditionalOptionsQuestionParams {
	type: 'conditional-text-options';
}

/**
 * Custom class for handling the use of nested conditional text inputs inside
 * of an options list. Can have multiple values be conditional. Class will handle
 * saving the values, displaying the correct value in the list, displaying the correct
 * text too. Will also handle removing any old text that is no longer associated
 * with the selected value.
 */
export default class ConditionalOptionsQuestion extends OptionsQuestion {
	conditionalMapping: Record<string, string>;

	constructor({ options, ...params }: ConditionalOptionsQuestionParams) {
		const processedOptions = options.map((option): SelectableOption => {
			const { conditional, ...restOption } = option;

			if (!conditional) {
				return restOption;
			}

			return {
				...restOption,
				conditional: {
					type: conditional.type || 'textarea',
					fieldName: `${option.value}_text`,
					question: conditional.question,
					value: option.value,
					inputClasses: 'govuk-!-width-one-half'
				}
			};
		});

		super({
			// default but allow overrides
			capitaliseAnswer: false,
			...params,
			viewFolder: 'custom-components/conditional-text-input',
			options: processedOptions
		});

		this.conditionalMapping = options.reduce(
			(acc, option) => {
				if (option.conditional?.fieldName) {
					acc[option.value] = option.conditional.fieldName;
				}
				return acc;
			},
			{} as Record<string, string>
		);
	}

	/**
	 * Prepares to display the text associated with the currently selected option,
	 * if any.
	 */
	override prepQuestionForRendering(
		section: Section,
		journey: Journey,
		customViewData: Record<string, unknown>,
		payload: Record<string, any> | undefined,
		options: PrepQuestionForRenderingOptions
	): QuestionViewModel {
		const answers = this.answerObjectFromJourneyResponse(journey.response, options);

		Object.entries(this.conditionalMapping).forEach(([optionValue, targetDbName]) => {
			const proxyUiName = `${this.fieldName}_${optionValue}_text`;

			answers[proxyUiName] = payload ? payload[proxyUiName] : answers[targetDbName] || '';
		});

		return super.prepQuestionForRendering(section, journey, customViewData, payload, options);
	}

	/**
	 * Grabs the main selected value + loops over the conditional options,
	 * finding the one that is associated with that value (if any) and preparing
	 * that text to be saved, whilst also setting any old text associated with
	 * an unselected field to null
	 */
	override async getDataToSave(req: Request): Promise<{ answers: Record<string, unknown> }> {
		const responseToSave: { answers: Record<string, unknown> } = { answers: {} };
		const { body } = req;

		const mainValue = body[this.fieldName]?.trim();
		responseToSave.answers[this.fieldName] = mainValue;

		Object.entries(this.conditionalMapping).forEach(([optionValue, targetDbName]) => {
			const proxyUiName = `${this.fieldName}_${optionValue}_text`;
			const textValue = body[proxyUiName]?.trim();

			// Prepare text to be saved if selected
			if (mainValue === optionValue) {
				responseToSave.answers[targetDbName] = textValue || null;
			} else {
				// Make sure to set any other options answers to null to avoid
				// DB having 2+ different text fields in columns
				responseToSave.answers[targetDbName] = null;
			}
		});

		return responseToSave;
	}

	/**
	 * Looks up any journey-stored conditional text for the selected answer and combines
	 * it with the raw value into the `{ value, conditional }` shape that `formatAnswer`
	 * knows how to render.
	 */
	override formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: string | null) {
		if (!answer) {
			return super.formatAnswerForSummary(sectionSegment, journey, answer);
		}

		const conditionalDbName = this.conditionalMapping[answer];
		const conditionalText = conditionalDbName ? this.setConditionalText(conditionalDbName, journey) : undefined;

		const hasConditionalText = typeof conditionalText === 'string' && conditionalText.trim() !== '';

		const answerForFormatting = hasConditionalText
			? { value: answer, conditional: { [answer]: (conditionalText as string).trim() } }
			: answer;

		return super.formatAnswerForSummary(sectionSegment, journey, answerForFormatting);
	}

	/**
	 * Formats the answer in the same way `RadioQuestion` does, handling the
	 * `{ value, conditional }` object shape (conditional text keyed by the selected value).
	 *
	 * Any conditional text is HTML-escaped and joined with a `<br>` tag.
	 */
	override formatAnswer(answer: unknown): string {
		if (answer === null || answer === undefined || answer === '') {
			return this.notStartedText;
		}

		// Handle simple string answers - delegate to OptionsQuestion.formatAnswer
		if (typeof answer !== 'object' || (answer as { value?: string }).value === undefined) {
			return super.formatAnswer(answer);
		}

		// Handle `{ value, conditional }` answers built by formatAnswerForSummary
		const answerObj = answer as { value: string; conditional?: Record<string, string> };
		const selectedOption = this.options.find((option) => option.value === answerObj.value);
		const optionText = escape(selectedOption?.text ?? answerObj.value);

		const conditionalValue = answerObj.conditional?.[answerObj.value];
		if (conditionalValue) {
			return `${optionText}<br>${escape(conditionalValue)}`;
		}

		return optionText;
	}

	/**
	 * Grabs the conditional text from journey response answers.
	 *
	 * If not found there it will double check to make sure we aren't
	 * in a cloned question, in which case the data structure will be
	 * flat with a predetermined key.
	 */
	setConditionalText(conditionalDbName: string, journey: Journey) {
		let conditionalText: unknown;

		if (journey?.response?.answers && conditionalDbName in journey.response.answers) {
			conditionalText = journey.response.answers[conditionalDbName];
		} else if (this.fieldName.includes('_')) {
			// If we are in a cloned / flattened question, then its key will
			// follow format <parent>_<index>_<fieldName>
			const match = this.fieldName.match(/^([a-zA-Z0-9]+)_(\d+)_/);
			if (match) {
				const listName = match[1];
				const index = parseInt(match[2], 10);
				const listData = journey?.response?.answers?.[listName];
				if (Array.isArray(listData) && listData[index]) {
					conditionalText = listData[index][conditionalDbName];
				}
			}
		}

		return conditionalText;
	}
}
