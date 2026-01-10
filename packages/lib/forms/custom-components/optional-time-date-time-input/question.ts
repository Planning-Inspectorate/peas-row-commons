import DateTimeQuestion from '@planning-inspectorate/dynamic-forms/src/components/date-time/question.js';
import { parseDateInput, formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import type { Request } from 'express';
import type { QuestionViewModel } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

/**
 * Custom component that behaves the same as DateTimeQuestion but allows
 * for Time to be removed, and if so, not displayed to the user.
 *
 * Functionality is mostly taken from the DateTimeQuestion class.
 */
export default class OptionalTimeDateTimeInput extends DateTimeQuestion {
	override prepQuestionForRendering(
		section: Section,
		journey: Journey,
		customViewData: Record<string, unknown>,
		payload?: Record<string, any>
	): QuestionViewModel {
		const viewModel = super.prepQuestionForRendering(section, journey, customViewData, payload);

		if (payload) return viewModel;

		const savedAnswer = journey.response.answers[this.fieldName];

		if (savedAnswer) {
			const date = new Date(savedAnswer);
			const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;

			if (isMidnight && viewModel.question?.value) {
				const valueObj = viewModel.question.value;
				valueObj[`${this.fieldName}_hour`] = '';
				valueObj[`${this.fieldName}_minutes`] = '';
				valueObj[`${this.fieldName}_period`] = '';
			}
		}
		return viewModel;
	}

	/**
	 * Same functionality as parent, expect it runs safeConvertTo24Hour
	 * which allows the user to select no AM/PM
	 */
	override async getDataToSave(
		req: Request,
		journeyResponse: JourneyResponse
	): Promise<{ answers: Record<string, unknown> }> {
		const dayInput = req.body[`${this.fieldName}_day`];
		const monthInput = req.body[`${this.fieldName}_month`];
		const yearInput = req.body[`${this.fieldName}_year`];
		const hourInput = req.body[`${this.fieldName}_hour`];
		const minutesInput = req.body[`${this.fieldName}_minutes`];
		const periodInput = req.body[`${this.fieldName}_period`];

		const hourToSave = this.safeConvertTo24Hour(hourInput, periodInput);

		const minuteToSave = minutesInput || 0;

		const responseToSave = { answers: {} as Record<string, unknown> };

		responseToSave.answers[this.fieldName] = parseDateInput({
			day: dayInput,
			month: monthInput,
			year: yearInput,
			hour: hourToSave,
			minute: minuteToSave
		});

		journeyResponse.answers[this.fieldName] = responseToSave.answers[this.fieldName];
		return responseToSave;
	}

	/**
	 * Same functionality as parent, expect it doesn't show the date if it is set
	 * to Midnight, as this can be assumed to be equivalent to "no time".
	 */
	override formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: string | null) {
		if (!answer) return super.formatAnswerForSummary(sectionSegment, journey, answer);

		const date = new Date(answer);
		const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;

		let displayValue: string;

		if (isMidnight) {
			displayValue = formatDateForDisplay(date, { format: this.dateFormat });
		} else {
			const formattedDate = formatDateForDisplay(date, { format: this.dateFormat });
			const formattedTime = formatDateForDisplay(date, { format: this.timeFormat });
			displayValue = `${formattedDate}<br>${formattedTime.toLowerCase()}`;
		}

		return [
			{
				key: this.title,
				value: displayValue,
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	/**
	 * Converts time to 24 hour.
	 */
	safeConvertTo24Hour(hour: string | number, period: string): number {
		const hourValue = Number(hour);
		if (period === 'am') return hourValue === 12 ? 0 : hourValue;
		if (period === 'pm') return hourValue === 12 ? 12 : hourValue + 12;
		return hourValue;
	}
}
