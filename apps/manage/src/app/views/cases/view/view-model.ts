import {
	dateISOStringToDisplayDate,
	dateISOStringToDisplayTime12hr,
	getDayFromISODate
} from '@pins/peas-row-commons-lib/util/dates.ts';
import type { CaseListFields, CaseNoteFields, CaseOfficer } from './types.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

function formatValue(value: any) {
	if (typeof value === 'boolean') {
		return booleanToYesNoValue(value);
	}
	return value;
}

const NESTED_SECTIONS: (keyof CaseListFields)[] = ['Dates', 'Costs', 'Abeyance', 'Notes'];

/**
 * Takes raw case data and converts into UI usable data format.
 * Converts the nested nature of join tables into a flat object.
 */
export function caseToViewModel(caseRow: CaseListFields, groupMembers: { caseOfficers: CaseOfficer[] }) {
	const mergedData: Record<string, any> = { ...caseRow };

	NESTED_SECTIONS.forEach((sectionKey) => {
		const nestedObject = mergedData[sectionKey];

		if (nestedObject && typeof nestedObject === 'object') {
			const cleanNested = { ...nestedObject };

			// We do this instead of destructuring above because otherwise linter complains
			// that we never use 'id'.
			if ('id' in cleanNested) {
				delete cleanNested.id;
			}

			Object.assign(mergedData, cleanNested);

			delete mergedData[sectionKey];
		}
	});

	if (caseRow.Applicant) {
		mergedData.applicantName = caseRow.Applicant.name;
		delete mergedData.Applicant;
	}

	if (caseRow.Authority) {
		mergedData.authorityName = caseRow.Authority.name;
		delete mergedData.Authority;
	}

	const sanitisedData: Record<string, any> = {};
	for (const key in mergedData) {
		if (key !== 'SiteAddress') {
			sanitisedData[key] = formatValue(mergedData[key]);
		}
	}

	let siteAddress = null;
	if (caseRow.SiteAddress) {
		siteAddress = {
			addressLine1: caseRow.SiteAddress.line1,
			addressLine2: caseRow.SiteAddress.line2,
			townCity: caseRow.SiteAddress.townCity,
			county: caseRow.SiteAddress.county,
			postcode: caseRow.SiteAddress.postcode
		};
	}

	const mappedNotes = mapNotes(caseRow.Notes || [], groupMembers);

	return {
		...sanitisedData,
		...mappedNotes,
		siteAddress,
		receivedDateDisplay: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime()
	};
}

/**
 * Maps the raw case data into data presented in the UI.
 */
export const mapNotes = (
	unmappedCaseNotes: Omit<CaseNoteFields, 'Case'>[],
	groupMembers: { caseOfficers: CaseOfficer[] }
) => {
	// Sort the cases first so that they are in descending order by creation date.
	const caseNotes = [...unmappedCaseNotes].sort((a: any, b: any) => b.createdAt - a.createdAt);

	return {
		caseNotes: caseNotes.map((caseNote) => {
			const user = groupMembers.caseOfficers.find((member) => member.id === caseNote.authorEntraId);

			return {
				date: dateISOStringToDisplayDate(caseNote.createdAt),
				dayOfWeek: getDayFromISODate(caseNote.createdAt),
				time: dateISOStringToDisplayTime12hr(caseNote.createdAt),
				commentText: caseNote.comment,
				userName: user?.displayName || 'Unknown'
			};
		})
	};
};
