import { BooleanQuestion } from '@planning-inspectorate/dynamic-forms';
import type { BooleanQuestionParams } from '@planning-inspectorate/dynamic-forms';

export default class BooleanWithExtraActions extends BooleanQuestion {
	constructor(params: BooleanQuestionParams) {
		super(params);
		this.viewFolder = 'custom-components/boolean-with-extra-actions';

		if (params.viewData) {
			this.viewData = params.viewData;
		}
	}
}
