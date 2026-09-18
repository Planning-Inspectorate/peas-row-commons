import { type JourneyResponse, type Question, BaseValidator } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import { body } from 'express-validator';

/**
 * Validator for validating a manage-list question's answer against another question's saved list
 * answer using a custom validation function, excluding the item currently being edited (identified
 * by `req.params.manageListItemId`) from the dependency list before validating.
 */
export class ManageListCrossFieldValidator extends BaseValidator {
	dependencyFieldName: string;
	validationFunction: (currentAnswer: unknown, dependencyAnswer: unknown) => boolean;

	constructor({
		dependencyFieldName,
		validationFunction
	}: {
		dependencyFieldName: string;
		validationFunction: (currentAnswer: unknown, dependencyAnswer: unknown) => boolean;
	}) {
		super();

		if (!dependencyFieldName) {
			throw new Error('ManageListCrossFieldValidator requires dependencyFieldName');
		}
		if (!validationFunction || typeof validationFunction !== 'function') {
			throw new Error('ManageListCrossFieldValidator requires a validationFunction');
		}

		this.dependencyFieldName = dependencyFieldName;
		this.validationFunction = validationFunction;
	}

	/**
	 * Gets the body field name to bind validation to.
	 * Uses the question's bodyFieldNames getter to determine which body field
	 * express-validator binds to for triggering validation.
	 */
	#getBodyFieldName(questionObj: Question) {
		// Use the first body field name from the question's bodyFieldNames getter
		// This allows questions to define their own body field names, supporting
		// custom components and complex field structures (e.g. date, date-time, address)
		return questionObj.bodyFieldNames?.[0] ?? questionObj.fieldName;
	}

	/**
	 * Validates response body against individual field validators.
	 */
	validate(questionObj: Question, journeyResponse: JourneyResponse) {
		const fieldName = questionObj.fieldName;
		const bodyFieldName = this.#getBodyFieldName(questionObj);

		return [
			body(bodyFieldName).custom(async (value, { req }) => {
				const answers = journeyResponse?.answers || {};
				let currentAnswer;
				if (typeof questionObj.getDataToSave === 'function') {
					const { answers: formattedAnswers } = await questionObj.getDataToSave(req as Request, journeyResponse);
					currentAnswer = fieldName in formattedAnswers ? formattedAnswers[fieldName] : formattedAnswers;
				} else {
					currentAnswer = req.body[fieldName];
				}

				const rawDependencyAnswer = answers[this.dependencyFieldName];
				const dependencyAnswer = Array.isArray(rawDependencyAnswer) ? rawDependencyAnswer : [];

				// Filters out current question answer so it doesn't validate against itself
				const manageListItemId = (req as Request).params?.manageListItemId;
				const filteredDependencyAnswer = dependencyAnswer.filter(
					(item: { id?: string }) => item?.id !== manageListItemId
				);

				return (
					this.validationFunction(currentAnswer, filteredDependencyAnswer) ||
					// Fallback if validation fails without throwing an error
					Promise.reject(
						new Error(`Cross-question validation failed between ${fieldName} and ${this.dependencyFieldName}`)
					)
				);
			})
		];
	}
}
