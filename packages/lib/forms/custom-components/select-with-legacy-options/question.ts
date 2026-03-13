import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type {
	Option,
	OptionsQuestionParams
} from '@planning-inspectorate/dynamic-forms/src/questions/options-question.js';
import OptionsQuestion from '@planning-inspectorate/dynamic-forms/src/questions/options-question.js';
import SelectQuestion from '@planning-inspectorate/dynamic-forms/src/components/select/question.js';

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
	html?: string;
	label?: string;
	legend?: string;
	legacyOptions: Option[];

	constructor(params: OptionsQuestionParams) {
		super({
			...params,
			viewFolder: !params.viewFolder ? 'select' : params.viewFolder
		});

		this.html = params.html;
		this.label = params.label;
		this.legend = params.legend;
		// New array of options that are not allowed to be displayed as selectable.
		this.legacyOptions = params.legacyOptions;
	}

	/**
	 * Similar functionality to parent function, but importantly runs new `getOptionByValue` which combines this.options
	 * with this.legacyOptions to allow the value to be presented on the summary but not on the select page.
	 *
	 * "super"s past the parent straight to the grandparent to avoid this getting overwritten
	 */
	formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: Record<string, unknown> | string) {
		if (answer) {
			const selectedOption = this.getOptionByValue(answer as string);
			const selectedText = selectedOption?.text || '';
			return OptionsQuestion.prototype.formatAnswerForSummary.call(this, sectionSegment, journey, selectedText, false);
		}
		return OptionsQuestion.prototype.formatAnswerForSummary.call(this, sectionSegment, journey, answer);
	}

	/**
	 * Combines real values with legacy ones to be viewable.
	 */
	getOptionByValue(value: string) {
		const allOptions = [...this.options, ...this.legacyOptions];
		return allOptions.find((option) => option.value === value);
	}
}
