import type { CaseListFields } from './types.ts';
import { formatInTimeZone } from 'date-fns-tz';

export function caseToViewModel(caseRow: CaseListFields) {
	const { Dates, ...caseData } = caseRow;

	// We need to create a soft copy here because we want
	// to delete the id so that we don't overwrite the Case
	// id when we spread.
	const safeDates = { ...Dates };

	if (safeDates.id) {
		delete safeDates.id;
	}

	return {
		...caseData,
		...safeDates,
		receivedDateDisplay: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime()
	};
}
