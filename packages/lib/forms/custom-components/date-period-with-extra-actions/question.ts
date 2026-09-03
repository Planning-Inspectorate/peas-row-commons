import { DatePeriodQuestion } from '@planning-inspectorate/dynamic-forms';
import type { DatePeriodQuestionParams } from '@planning-inspectorate/dynamic-forms';

export interface DatePeriodWithExtraActionsProps extends DatePeriodQuestionParams {
	type: 'date-period-with-extra-actions';
}

export default class DatePeriodWithExtraActions extends DatePeriodQuestion {
	constructor(params: DatePeriodQuestionParams) {
		super(params);
		this.viewFolder = 'custom-components/date-period-with-extra-actions';
	}
}
