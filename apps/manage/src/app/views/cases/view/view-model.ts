import {
	dateISOStringToDisplayDate,
	dateISOStringToDisplayTime12hr,
	getDayFromISODate
} from '@pins/peas-row-commons-lib/util/dates.ts';
import type { CaseListFields, CaseNoteFields, CaseOfficer } from './types.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { mapAddressDbToViewModel } from '@pins/peas-row-commons-lib/util/address.ts';
import { mapContacts } from '@pins/peas-row-commons-lib/util/contact.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';

function formatValue(value: any) {
	if (typeof value === 'boolean') {
		return booleanToYesNoValue(value);
	}
	return value;
}

const NESTED_SECTIONS: (keyof CaseListFields)[] = ['Dates', 'Costs', 'Abeyance', 'Notes', 'Decision'];

/**
 * Flattens the Procedures array into procedureOne..., procedureTwo... fields
 */
export function mapProcedures(procedures: any[]) {
	if (!procedures || !Array.isArray(procedures)) return {};

	const flattened: Record<string, any> = {};

	procedures.forEach((proc) => {
		if (!proc.step) return;
		const suffix = proc.step.replace('Procedure', '');
		const prefix = `procedure${suffix}`;

		Object.keys(proc).forEach((key) => {
			if (['step', 'caseId', 'id', 'createdAt', 'updatedAt'].includes(key)) return;

			const value = proc[key];
			if (value === null || value === undefined) return;

			const suffixKey = key.charAt(0).toUpperCase() + key.slice(1);

			const uiKey = `${prefix}${suffixKey}`;

			if (key.endsWith('Venue') && typeof value === 'object') {
				flattened[uiKey] = mapAddressDbToViewModel(value);
			} else {
				flattened[uiKey] = formatValue(value);
			}
		});
	});

	return flattened;
}

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

	if (caseRow.RelatedCases?.length) {
		mergedData.relatedCaseDetails = caseRow.RelatedCases.map((relatedCase) => ({
			id: relatedCase.id,
			relatedCaseReference: relatedCase.reference
		}));
		delete mergedData.RelatedCases;
	}

	if (caseRow.LinkedCases?.length) {
		mergedData.linkedCaseDetails = caseRow.LinkedCases.map((linkedCase) => ({
			id: linkedCase.id,
			linkedCaseReference: linkedCase.reference,
			linkedCaseIsLead: formatValue(linkedCase.isLead)
		}));
		delete mergedData.LinkedCases;
	}

	const mappedProcedures = mapProcedures(mergedData.Procedures || []);
	delete mergedData.Procedures;

	const sanitisedData: Record<string, any> = {};
	for (const key in mergedData) {
		if (key !== 'SiteAddress') {
			sanitisedData[key] = formatValue(mergedData[key]);
		}
	}

	const siteAddress = mapAddressDbToViewModel(caseRow.SiteAddress);

	const mappedNotes = mapNotes(caseRow.Notes || [], groupMembers);

	const objectors = (caseRow.Contacts || []).filter((contact) => contact.contactTypeId === CONTACT_TYPE_ID.OBJECTOR);
	const genericContacts = (caseRow.Contacts || []).filter(
		(contact) => contact.contactTypeId !== CONTACT_TYPE_ID.OBJECTOR
	);

	const mappedObjectors = mapContacts(objectors, 'objector');
	const mappedContacts = mapContacts(genericContacts, 'contact');

	return {
		...sanitisedData,
		...mappedProcedures,
		...mappedNotes,
		siteAddress,
		receivedDateDisplay: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime(),
		inspectorDetails: caseRow.Inspectors,
		objectorDetails: mappedObjectors,
		contactDetails: mappedContacts
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
