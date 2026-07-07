import { body } from 'express-validator';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';

export default class NestedRequiredValidator extends BaseValidator {
	errorMessage: string;

	constructor(errorMessage: string = 'Select a destination folder') {
		super();
		this.errorMessage = errorMessage;
	}

	/**
	 * Indicates whether this validator makes the field required.
	 * Since this validator checks for a root folder selection, it is effectively a required validator.
	 */
	isRequired(): boolean {
		return true;
	}

	/**
	 * We only need to check if the base level folder was at least selected
	 * if they did that then we know they've at least chosen something.
	 */
	validate(questionObj: any) {
		return body().custom((_, { req }) => {
			const rootInputName = `${questionObj.fieldName}_level_0_root`;

			const rootValue = req.body[rootInputName];

			if (!rootValue) {
				throw new Error(this.errorMessage);
			}

			return true;
		});
	}
}
