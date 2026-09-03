import type { RadioQuestionParams, SelectableOption } from '@planning-inspectorate/dynamic-forms';
import { RadioQuestion } from '@planning-inspectorate/dynamic-forms';
import escape from 'escape-html';

export type LegacyRadioQuestionParams = RadioQuestionParams & {
	viewFolder?: string;
	legacyOptions: SelectableOption[];
};

/**
 * A radio question that has `options` the same as a regular radio
 * but importantly has a set of legacy options that are NOT to be presented
 * to the user at all, but are needed for finding the data of legacy data
 * or unique data that isn't from the seed static data.
 *
 * Example: an old case has a subtype 'old-type: Old type' that no longer exists.
 * We need this component to be able to show that the type is Old type, but not
 * allow any new cases to change their subtype to this.
 */
export default class LegacyRadioQuestion extends RadioQuestion {
	legacyOptions: SelectableOption[];

	constructor(params: LegacyRadioQuestionParams) {
		const superParams = {
			...params,
			viewFolder: !params.viewFolder ? 'radio' : params.viewFolder
		};
		super(superParams);

		this.html = params.html;
		this.label = params.label;
		this.legend = params.legend;
		// New array of options that are not allowed to be displayed as selectable.
		this.legacyOptions = params.legacyOptions;
	}

	/**
	 * Mirrors the parent `RadioQuestion.formatAnswer`, but resolves options via `getOptionByValue`
	 * so that legacy (non-selectable) options can still be displayed correctly on the summary page.
	 */
	formatAnswer(answer: unknown): string {
		if (answer === null || answer === undefined || answer === '') {
			return this.notStartedText;
		}

		// Handle simple string answers
		if (typeof answer !== 'object' || (answer as { value?: string }).value === undefined) {
			const option = this.getOptionByValue(answer as string);
			return escape(option?.text ?? '');
		}

		// Handle object answers with conditional fields
		const answerObj = answer as { value: string; conditional?: Record<string, string> };
		const option = this.getOptionByValue(answerObj.value);
		const optionText = escape(option?.text ?? '');

		const conditionalValue = answerObj.conditional?.[answerObj.value];
		if (conditionalValue && option) {
			const label = option.conditional?.label ? `${escape(option.conditional.label)} ` : '';
			return `${optionText}<br>${label}${escape(conditionalValue)}`;
		}
		return optionText;
	}

	/**
	 * Combines real values with legacy ones to be viewable.
	 */
	getOptionByValue(value: string) {
		const allOptions = [...this.options, ...this.legacyOptions];
		return allOptions.find((option) => option.value === value);
	}
}
