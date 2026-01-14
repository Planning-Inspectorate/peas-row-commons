import OptionsQuestion from '@planning-inspectorate/dynamic-forms/src/questions/options-question.js';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type { Request } from 'express';
import type { QuestionViewModel } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

interface ConditionalConfig {
	question: string;
	fieldName: string;
	type?: 'textarea' | 'text';
}

interface OptionWithCondition {
	text: string;
	value: string;
	hint?: { text: string };
	attributes?: Record<string, string>;
	conditional?: ConditionalConfig;
}

interface ConditionalOptionsQuestionParams {
	title: string;
	question: string;
	fieldName: string;
	options: OptionWithCondition[];
	url?: string;
	hint?: string;
	validators?: any[];
	editable?: boolean;
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

	constructor({
		title,
		question,
		fieldName,
		url,
		hint,
		validators,
		options,
		editable
	}: ConditionalOptionsQuestionParams) {
		const processedOptions = options.map((option) => {
			if (option.conditional) {
				return {
					...option,
					conditional: {
						type: option.conditional.type || 'textarea',
						fieldName: `${option.value}_text`,
						question: option.conditional.question,
						value: option.value,
						inputClasses: 'govuk-!-width-one-half'
					}
				};
			}
			return option;
		});

		super({
			title,
			viewFolder: 'custom-components/conditional-text-input',
			fieldName,
			url,
			question,
			validators,
			options: processedOptions,
			hint,
			editable
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
		payload?: Record<string, any>
	): QuestionViewModel {
		const answers = journey.response.answers;

		Object.entries(this.conditionalMapping).forEach(([optionValue, targetDbName]) => {
			const proxyUiName = `${this.fieldName}_${optionValue}_text`;

			answers[proxyUiName] = payload ? payload[proxyUiName] : answers[targetDbName] || '';
		});

		return super.prepQuestionForRendering(section, journey, customViewData, payload);
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
				const conditionalToSave = textValue || null;
				responseToSave.answers[targetDbName] = conditionalToSave;
			} else {
				// Make sure to set any other options answers to null to avoid
				// DB having 2+ different text fields in columns
				responseToSave.answers[targetDbName] = null;
			}
		});

		return responseToSave;
	}

	/**
	 * Formats answer in the same way that a 'radio' option might, using the
	 * text value and not the key capitalised.
	 */
	override formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: string | null) {
		if (answer) {
			const selectedOption = this.options.find((option) => option.value === answer);
			const selectedText = selectedOption?.text || '';
			return super.formatAnswerForSummary(sectionSegment, journey, selectedText, false);
		}
		return super.formatAnswerForSummary(sectionSegment, journey, answer);
	}
}
