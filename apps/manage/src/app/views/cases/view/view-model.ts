import {
	dateISOStringToDisplayDate,
	dateISOStringToDisplayTime12hr,
	getDayFromISODate
} from '@pins/peas-row-commons-lib/util/dates.ts';
import type { CaseListFields, CaseNoteFields } from './types.ts';
import { formatInTimeZone } from 'date-fns-tz';

export async function caseToViewModel(caseRow: CaseListFields) {
	const { Dates, Notes, ...caseData } = caseRow;

	// We need to create a soft copy here because we want
	// to delete the id so that we don't overwrite the Case
	// id when we spread.
	const safeDates = { ...Dates };

	if (safeDates.id) {
		delete safeDates.id;
	}

	const mappedNotes = Notes && Notes.length ? await mapNotes(Notes) : [];

	return {
		...caseData,
		...safeDates,
		...mappedNotes,
		receivedDateDisplay: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime()
	};
}

/**
 * Maps the raw case data into data presented in the UI.
 */
export const mapNotes = async (unmappedCaseNotes: Omit<CaseNoteFields, 'Case'>[]) => {
	// Sort the cases first so that they are in descending order by creation date.
	const caseNotes = [...unmappedCaseNotes].sort((a: any, b: any) => b.createdAt - a.createdAt);

	return {
		caseNotes: await Promise.all(
			caseNotes.map((caseNote) => {
				return {
					date: dateISOStringToDisplayDate(caseNote.createdAt),
					dayOfWeek: getDayFromISODate(caseNote.createdAt),
					time: dateISOStringToDisplayTime12hr(caseNote.createdAt),
					commentText: caseNote.comment,
					userName: caseNote.userId
				};
			})
		)
	};
};
