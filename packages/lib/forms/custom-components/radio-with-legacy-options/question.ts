import RadioQuestion from '@planning-inspectorate/dynamic-forms/src/components/radio/question.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type {
	Option,
	OptionsQuestionParams
} from '@planning-inspectorate/dynamic-forms/src/questions/options-question.js';
import OptionsQuestion from '@planning-inspectorate/dynamic-forms/src/questions/options-question.js';

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
	html?: string;
	label?: string;
	legend?: string;
	legacyOptions: Option[];

	constructor(params: OptionsQuestionParams) {
		super({
			...params,
			viewFolder: !params.viewFolder ? 'radio' : params.viewFolder
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
		if (typeof answer === 'object' && answer?.conditional) {
			const selectedOption = this.getOptionByValue(answer.value as string);
			const conditionalAnswerText = selectedOption?.conditional?.label
				? `${selectedOption.conditional.label} ${answer.conditional}`
				: answer.conditional;
			const formattedAnswer = [selectedOption?.text, conditionalAnswerText].join('\n');
			return OptionsQuestion.prototype.formatAnswerForSummary.call(
				this,
				sectionSegment,
				journey,
				formattedAnswer,
				false
			);
		} else if (answer && typeof answer === 'string') {
			const selectedOption = this.getOptionByValue(answer);
			const selectedText = selectedOption?.text || '';
			return OptionsQuestion.prototype.formatAnswerForSummary.call(this, sectionSegment, journey, selectedText, false);
		}
		return super.formatAnswerForSummary(sectionSegment, journey, answer);
	}

	/**
	 * Combines real values with legacy ones to be viewable.
	 */
	getOptionByValue(value: string) {
		const allOptions = [...this.options, ...this.legacyOptions];
		return allOptions.find((option) => option.value === value);
	}
}
