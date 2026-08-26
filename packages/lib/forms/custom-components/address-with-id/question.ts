import { AddressQuestion } from '@planning-inspectorate/dynamic-forms';
import type { JourneyResponse, SiteAddressQuestionParams } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

export type AddressWithIdQuestionProps = SiteAddressQuestionParams & {
	type: 'address-with-id';
};

/**
 * An address input that has a hidden ID field that gets populated
 * with the DB id (if it exists already), this is then used on save
 * to determine whether the DB query should be an update or a create
 * action.
 */
export default class AddressWithIdQuestion extends AddressQuestion {
	viewFolder: string;
	constructor(params: SiteAddressQuestionParams) {
		super(params);
		this.viewFolder = 'custom-components/address-with-id';
	}

	/**
	 * Adds the ID (if available) from the UI onto the data to save,
	 * used by the saving function to identify whether the save should
	 * be a new save or an update.
	 */
	async getDataToSave(req: Request, journeyResponse: JourneyResponse): Promise<{ answers: Record<string, unknown> }> {
		const result = await super.getDataToSave(req, journeyResponse);

		const addressId = req.body[`${this.fieldName}_hiddenId`];
		const addressAnswer = result.answers[this.fieldName];

		if (addressId && addressAnswer && typeof addressAnswer === 'object') {
			(addressAnswer as { id?: string }).id = String(addressId);
		}

		return result;
	}

	/**
	 * Appends the id (if any) onto the answer so that we can insert
	 * it into a hidden input field in the UI.
	 */
	answerForViewModel(answers: Record<string, unknown>) {
		const addressAnswer = answers[this.fieldName] as { id?: string } | undefined;

		return {
			...super.answerForViewModel(answers),
			id: addressAnswer?.id || ''
		};
	}
}
