import { type JourneyResponse, type Question, BaseValidator } from '@planning-inspectorate/dynamic-forms';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';
import { body } from 'express-validator';

/**
 * Validates a manage-list field's own answer array using a custom function, skipping validation on remove actions.
 */
export class ManageListItemsValidator extends BaseValidator {
	validationFunction: (listItems: unknown) => boolean;

	constructor({ validationFunction }: { validationFunction: (listItems: unknown) => boolean }) {
		super();
		if (typeof validationFunction !== 'function') {
			throw new Error('LinkedCasesLeadValidator requires a validationFunction');
		}
		this.validationFunction = validationFunction;
	}

	/**
	 * Validates the manage-list question's answer array using the configured validationFunction.
	 */
	validate(questionObj: Question, journeyResponse: JourneyResponse) {
		return body().custom(async (_, { req }) => {
			// Allow removing items even if the list is otherwise "invalid"
			if (req.params?.manageListAction === MANAGE_LIST_ACTIONS.REMOVE) {
				return true;
			}

			const listItems = journeyResponse?.answers?.[questionObj.fieldName] || [];
			return this.validationFunction(listItems);
		});
	}
}
