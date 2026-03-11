import { body, validationResult, type ValidationChain } from 'express-validator';
import { isBefore } from 'date-fns';

import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import { parseDateInput } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';

interface DateValidationSettings {
	ensureFuture: boolean;
	ensurePast: boolean;
}

interface DateQuestion {
	fieldName: string;
}

interface DateInputFields {
	startDayInput: string;
	startMonthInput: string;
	startYearInput: string;
	endDayInput: string;
	endMonthInput: string;
	endYearInput: string;
}

/**
 * Enforces a user has entered a valid date period.
 *
 * Supports an optional end date — when `endOptional` is true and all three
 * end-date fields are empty the end-date validators are skipped entirely.
 */
export default class CustomDatePeriodValidator extends BaseValidator {
	endDateAfterStartDate: boolean;
	endDateAfterStartDateMessage: string;
	startDateValidator: DateValidator;
	endDateValidator: DateValidator;
	inputLabel: string;
	endOptional: boolean;

	constructor(
		inputLabel: string,
		startDateValidationSettings: DateValidationSettings,
		endDateValidationSettings: DateValidationSettings,
		endDateAfterStartDate = true,
		endOptional = false,
		endDateAfterStartDateMessage?: string
	) {
		super(inputLabel, {}, {});
		this.inputLabel = inputLabel;
		this.startDateValidator = new DateValidator(`${inputLabel} start date`, startDateValidationSettings);
		this.endDateValidator = new DateValidator(`${inputLabel} end date`, endDateValidationSettings);
		this.endDateAfterStartDate = endDateAfterStartDate;
		this.endOptional = endOptional;
		this.endDateAfterStartDateMessage =
			endDateAfterStartDateMessage ?? `The end date must be on or after the start date`;
	}

	/**
	 * Validates the date period response body.
	 */
	validate(questionObj: DateQuestion): ValidationChain[] {
		const fieldName = questionObj.fieldName;
		const startDayInput = `${fieldName}_start_day`;
		const startMonthInput = `${fieldName}_start_month`;
		const startYearInput = `${fieldName}_start_year`;
		const endDayInput = `${fieldName}_end_day`;
		const endMonthInput = `${fieldName}_end_month`;
		const endYearInput = `${fieldName}_end_year`;

		const chains: ValidationChain[] = [
			// Start date is always validated
			...this.startDateValidator.validate({ ...questionObj, fieldName: `${fieldName}_start` })
		];

		if (this.endOptional) {
			// When endOptional is true we cannot use the DateValidator chains directly
			// because express-validator's .if() does not reliably prevent .notEmpty()
			// errors from firing on already-built chains.
			//
			// Instead we run the end-date validators inside .custom() callbacks against
			// a separate request object, then surface any relevant errors. This ensures
			// that when all three end fields are blank, no errors are produced.
			chains.push(
				...this.buildOptionalEndDateRules(questionObj, {
					endDayInput,
					endMonthInput,
					endYearInput
				})
			);
		} else {
			chains.push(...this.endDateValidator.validate({ ...questionObj, fieldName: `${fieldName}_end` }));
		}

		chains.push(
			...this.rulesForEndDateAfterStartDate({
				startDayInput,
				startMonthInput,
				startYearInput,
				endDayInput,
				endMonthInput,
				endYearInput
			})
		);

		return chains;
	}

	/**
	 * Builds validation chains for an optional end date.
	 *
	 * Runs the standard DateValidator chains only when at least one end-date
	 * field has been filled in. When all three are empty, no errors are produced.
	 *
	 * Each end-date field (day, month, year) gets its own chain that:
	 * 1. Checks if all end fields are empty → passes silently
	 * 2. Otherwise runs the full DateValidator against an isolated request
	 * 3. Surfaces only the error relevant to that specific field
	 */
	private buildOptionalEndDateRules(
		questionObj: DateQuestion,
		inputs: { endDayInput: string; endMonthInput: string; endYearInput: string }
	): ValidationChain[] {
		const { endDayInput, endMonthInput, endYearInput } = inputs;
		const endDateValidator = this.endDateValidator;
		const fieldName = questionObj.fieldName;

		const buildChainForField = (targetField: string): ValidationChain => {
			return body(targetField).custom(async (_, { req }) => {
				const day = req.body[endDayInput];
				const month = req.body[endMonthInput];
				const year = req.body[endYearInput];

				// All empty — nothing to validate
				if (!day && !month && !year) {
					return true;
				}

				// At least one field has a value — run the full end-date validation
				// against an isolated request to avoid polluting the real one
				const endChains = endDateValidator.validate({ ...questionObj, fieldName: `${fieldName}_end` });
				const isolatedReq = { body: { ...req.body } };

				await Promise.all(endChains.map((chain: ValidationChain) => chain.run(isolatedReq)));

				const result = validationResult(isolatedReq);

				if (!result.isEmpty()) {
					const errors = result.array();
					const fieldError = errors.find((e: any) => e.path === targetField);
					if (fieldError) {
						throw new Error(fieldError.msg);
					}
				}

				return true;
			});
		};

		return [buildChainForField(endDayInput), buildChainForField(endMonthInput), buildChainForField(endYearInput)];
	}

	/**
	 * Creates validation rules to ensure end date is on or after start date.
	 */
	rulesForEndDateAfterStartDate({
		startDayInput,
		startMonthInput,
		startYearInput,
		endDayInput,
		endMonthInput,
		endYearInput
	}: DateInputFields): ValidationChain[] {
		if (!this.endDateAfterStartDate) {
			return [];
		}

		return [
			body(endDayInput).custom((_, { req }) => {
				const startDay = req.body[startDayInput];
				const startMonth = req.body[startMonthInput];
				const startYear = req.body[startYearInput];
				const endDay = req.body[endDayInput];
				const endMonth = req.body[endMonthInput];
				const endYear = req.body[endYearInput];

				// Skip comparison if any component is missing
				if (![startDay, startMonth, startYear, endDay, endMonth, endYear].every(Boolean)) {
					return true;
				}

				const startDate = parseDateInput({ day: startDay, month: startMonth, year: startYear });
				const endDate = parseDateInput({ day: endDay, month: endMonth, year: endYear });

				if (isBefore(endDate, startDate)) {
					throw new Error(this.endDateAfterStartDateMessage);
				}

				return true;
			})
		];
	}
}
