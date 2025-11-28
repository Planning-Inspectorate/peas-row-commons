import type { CaseListFields } from './types.ts';
import { formatInTimeZone } from 'date-fns-tz';

export function caseToViewModel(caseRow: CaseListFields) {
	const viewModel = {
		...caseRow,
		receivedDate: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime()
	};
	return viewModel;
}
