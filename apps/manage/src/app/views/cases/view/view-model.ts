import type { CaseListFields } from './types.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

function formatValue(value: any) {
	if (typeof value === 'boolean') {
		return booleanToYesNoValue(value);
	}
	return value;
}

export function caseToViewModel(caseRow: CaseListFields) {
	const { Dates, Costs, ...caseData } = caseRow;

	// We destructure then delete ids so we have a flat object for displaying
	const safeDates = { ...Dates };
	const safeCosts = { ...Costs };

	delete safeDates.id;
	delete safeCosts.id;

	const mergedData = {
		...caseData,
		...safeDates,
		...safeCosts
	};

	const sanitisedData: Record<string, any> = {};

	Object.keys(mergedData).forEach((key) => {
		const value = mergedData[key as keyof typeof mergedData];
		sanitisedData[key] = formatValue(value);
	});

	return {
		...sanitisedData,
		receivedDateDisplay: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime()
	};
}
