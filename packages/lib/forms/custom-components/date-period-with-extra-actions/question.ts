import DatePeriodQuestion from '@planning-inspectorate/dynamic-forms/src/components/date-period/question.js';
import type { QuestionParameters } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

export default class DatePeriodWithExtraActions extends DatePeriodQuestion {
	constructor(params: QuestionParameters) {
		super(params);
		this.viewFolder = 'custom-components/date-period-with-extra-actions';

		if (params.viewData) {
			this.viewData = params.viewData;
		}
	}
}
