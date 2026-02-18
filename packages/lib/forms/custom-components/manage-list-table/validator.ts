import { body } from 'express-validator';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import ManageListQuestion from '@planning-inspectorate/dynamic-forms/src/components/manage-list/question.js';
import { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

/**
 * Validator for the manage list table.
 * Passed an object of required fields, if the journey response
 * doesn't have an answer for all the keys for all the rows, it will throw an error.
 */
export default class ManageListItemsCompleteValidator extends BaseValidator {
	requiredFields: Record<string, string>;

	constructor(requiredFields: Record<string, string> = {}) {
		super();
		this.requiredFields = requiredFields;
	}

	/**
	 * Entry function for validation, called on submit of page
	 */
	validate(questionObj: ManageListQuestion, journeyResponse: JourneyResponse) {
		return body().custom(async () => {
			const listItems = journeyResponse?.answers?.[questionObj.fieldName] || [];

			if (listItems.length === 0) {
				return true;
			}

			const questions = questionObj.section?.questions || [];
			const allErrors = this.getValidationErrors(listItems, questions);

			if (allErrors.length > 0) {
				const dedupedErrors = [...new Set(allErrors)];
				const formattedMessage = `Add ${dedupedErrors.map((e) => `'${e}'`).join(', ')}`;
				throw new Error(formattedMessage);
			}

			return true;
		});
	}

	/**
	 * Checks all rows for any validation errors
	 */
	private getValidationErrors(listItems: Record<string, unknown>[], questions: Question[]): string[] {
		const errors: string[] = [];

		for (const item of listItems) {
			const itemErrors = this.validateSingleItem(item, questions);
			errors.push(...itemErrors);
		}

		return errors;
	}

	/**
	 * Checks row in the manage list table for each required question.
	 */
	private validateSingleItem(item: Record<string, unknown>, questions: Question[]): string[] {
		const itemErrors: string[] = [];

		for (const [fieldName, customErrorMessage] of Object.entries(this.requiredFields)) {
			const subQuestion = questions.find((q: Question) => q.fieldName === fieldName);

			if (this.isQuestionRequiredAndEmpty(subQuestion, item, fieldName)) {
				itemErrors.push(customErrorMessage);
			}
		}

		return itemErrors;
	}

	/**
	 * Checks if the question is visible (needed for conditional logic)
	 * and if so checks to make sure it is not empty.
	 */
	private isQuestionRequiredAndEmpty(
		subQuestion: Question | undefined,
		item: Record<string, unknown>,
		fieldName: string
	): boolean {
		const isVisible = subQuestion?.shouldDisplay
			? subQuestion.shouldDisplay({ answers: item } as JourneyResponse)
			: true;

		return isVisible && this.isEmpty(item[fieldName]);
	}

	/**
	 * Checks for various permutations of "not answered"
	 */
	private isEmpty(value: unknown): boolean {
		if (value === undefined || value === null) return true;
		if (typeof value === 'string' && value.trim() === '') return true;
		if (Array.isArray(value) && value.length === 0) return true;

		// Dates will fail the final check as they are considered an object and will be seen as empty,
		// so we have this custom check instead.
		if (value instanceof Date) {
			return isNaN(value.getTime());
		}

		if (typeof value === 'object' && !Array.isArray(value)) {
			return Object.values(value).every((val) => this.isEmpty(val));
		}

		return false;
	}
}
