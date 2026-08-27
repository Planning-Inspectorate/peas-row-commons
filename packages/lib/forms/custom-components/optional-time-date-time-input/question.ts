import { DateTimeQuestion, parseDateInput, formatDateForDisplay } from '@planning-inspectorate/dynamic-forms';
import type { Section, Journey, QuestionViewModel } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import { safeConvertTo24Hour } from '@pins/peas-row-commons-lib/util/dates.ts';
import { formatInTimeZone } from 'date-fns-tz';

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
			const date = new Date(savedAnswer as string | number | Date);
			const isMidnight = this.isMidnight(date);

			if (isMidnight && viewModel.question?.value) {
				const valueObj = viewModel.question.value as Record<string, string>;
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
	override async getDataToSave(req: Request): Promise<{ answers: Record<string, unknown> }> {
		const dayInput = req.body[`${this.fieldName}_day`];
		const monthInput = req.body[`${this.fieldName}_month`];
		const yearInput = req.body[`${this.fieldName}_year`];
		const hourInput = req.body[`${this.fieldName}_hour`];
		const minutesInput = req.body[`${this.fieldName}_minutes`];
		const periodInput = req.body[`${this.fieldName}_period`];

		const hourToSave = safeConvertTo24Hour(hourInput, periodInput);

		const minuteToSave = minutesInput || 0;

		const responseToSave = { answers: {} as Record<string, unknown> };

		responseToSave.answers[this.fieldName] = parseDateInput({
			day: dayInput,
			month: monthInput,
			year: yearInput,
			hour: hourToSave,
			minute: minuteToSave
		});

		return responseToSave;
	}

	/**
	 * Same functionality as parent, expect it doesn't show the date if it is set
	 * to Midnight, as this can be assumed to be equivalent to "no time".
	 */
	override formatAnswer(answer: unknown): string {
		if (!answer) return this.notStartedText;

		const date = new Date(answer as string | number | Date);
		const isMidnight = this.isMidnight(date);

		if (isMidnight) {
			return formatDateForDisplay(date, { format: this.dateFormat });
		}

		const formattedDate = formatDateForDisplay(date, { format: this.dateFormat });
		const formattedTime = formatDateForDisplay(date, { format: this.timeFormat });
		return `${formattedDate}<br>${formattedTime.toLowerCase()}`;
	}

	/**
	 * Checks if the provided date is midnight in the UK
	 */
	isMidnight(date: Date) {
		const timeInUK = formatInTimeZone(date, 'Europe/London', 'HH:mm');
		return timeInUK === '00:00';
	}
}
