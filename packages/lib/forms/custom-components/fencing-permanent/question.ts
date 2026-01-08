import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import ConditionalOptionsQuestion from '../conditional-text-input/question.ts';

export default class FencingPermanentQuestion extends ConditionalOptionsQuestion {
	/**
	 * The fencing permanent question specifically wants unique display here.
	 * '-' if no answer
	 * 'Yes' if yes selected
	 * 'No' if no selected
	 * 'Free text added' if no selected + text added
	 */
	override formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: string | null) {
		const options = this.options;
		const selectedOption = options.find((opt) => opt.value === answer);

		if (!selectedOption || !answer) {
			return [
				{
					key: this.title,
					value: '-',
					action: this.getAction(sectionSegment, journey, answer)
				}
			];
		}

		let displayValue = selectedOption.text;

		const targetDbName = this.conditionalMapping[answer];
		if (targetDbName) {
			const textAnswer = journey.response.answers[targetDbName];
			if (textAnswer) {
				displayValue = 'Free text added';
			}
		}

		return [
			{
				key: this.title,
				value: displayValue,
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}
}
