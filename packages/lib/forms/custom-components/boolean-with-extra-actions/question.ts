import BooleanQuestion from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import type { QuestionParameters } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

export default class BooleanWithExtraActions extends BooleanQuestion {
	constructor(params: QuestionParameters) {
		super(params);
		this.viewFolder = 'custom-components/boolean-with-extra-actions';

		if (params.viewData) {
			this.viewData = params.viewData;
		}
	}
}
