import { body } from 'express-validator';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

interface AtLeastOneFieldValidatorParams {
	fields: string[];
	errorMessage?: string;
}

/**
 * For a Multi Field Input, checks that at least one of the provided fields have been answered.
 */
export default class AtLeastOneFieldValidator extends BaseValidator {
	fields: string[];
	errorMessage: string;

	constructor({ fields, errorMessage }: AtLeastOneFieldValidatorParams) {
		super();

		if (!fields || fields.length === 0) {
			throw new Error('AtLeastOneFieldValidator is invoked without any fields');
		}

		this.fields = fields;
		this.errorMessage = errorMessage || 'Please complete at least one field';
	}

	validate(questionObj: Question) {
		return [
			body(questionObj.fieldName).custom((_, { req }) => {
				const hasAtLeastOne = this.fields.some((fieldName) => {
					const fieldValue = req.body[fieldName];
					return typeof fieldValue === 'string' && fieldValue.trim().length > 0;
				});

				if (!hasAtLeastOne) {
					throw new Error(this.errorMessage);
				}

				return true;
			})
		];
	}
}
