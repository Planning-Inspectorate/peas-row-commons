import type { SelectableOption, SelectQuestionParams } from '@planning-inspectorate/dynamic-forms';
import { SelectQuestion } from '@planning-inspectorate/dynamic-forms';
import escape from 'escape-html';

export type LegacySelectQuestionParams = SelectQuestionParams & {
	legacyOptions?: SelectableOption[];
	viewFolder?: string;
};

/**
 * Question props shape for the `legacy-select` custom component.
 */
export interface LegacySelectQuestionProps extends LegacySelectQuestionParams {
	type: 'legacy-select';
}

/**
 * A select question that has `options` the same as a regular select
 * but importantly has a set of legacy options that are NOT to be presented
 * to the user at all, but are needed for finding the data of legacy data
 * or unique data that isn't from the seed static data.
 *
 * Example: an old case has an act of 'old-act: Old act' that no longer exists.
 * We need this component to be able to show that the type is Old act, but not
 * allow any new cases to change their act to this.
 */
export default class LegacySelectQuestion extends SelectQuestion {
	legacyOptions: SelectableOption[];

	constructor(params: LegacySelectQuestionParams) {
		const superParams = {
			...params,
			viewFolder: !params.viewFolder ? 'select' : params.viewFolder
		};
		super(superParams);

		this.html = params.html;
		this.label = params.label;
		this.legend = params.legend;
		// New array of options that are not allowed to be displayed as selectable.
		this.legacyOptions = params.legacyOptions ?? [];
	}

	/**
	 * Similar functionality to parent function, but importantly runs new `getOptionByValue` which combines this.options
	 * with this.legacyOptions to allow the value to be presented on the summary but not on the select page.
	 */
	formatAnswer(answer: unknown): string {
		if (answer === null || answer === undefined || answer === '') {
			return this.notStartedText;
		}

		const selectedOption = this.getOptionByValue(answer as string);
		return escape(selectedOption?.text ?? '');
	}

	/**
	 * Combines real values with legacy ones to be viewable.
	 */
	getOptionByValue(value: string) {
		const allOptions = [...this.options, ...this.legacyOptions];
		return allOptions.find((option) => option.value === value);
	}
}
