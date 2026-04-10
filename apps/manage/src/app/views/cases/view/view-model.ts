import {
	dateISOStringToDisplayDate,
	dateISOStringToDisplayTime12hr,
	getDayFromISODate
} from '@pins/peas-row-commons-lib/util/dates.ts';
import type { CaseDecisionFields, CaseListFields, CaseNoteFields, CaseProcedureFields } from './types.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { mapAddressDbToViewModel } from '@pins/peas-row-commons-lib/util/address.ts';
import { mapContacts } from '@pins/peas-row-commons-lib/util/contact.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';
import { DECISION_MAKER_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/decision-maker-type.ts';
import { nl2br, truncateComment } from '@pins/peas-row-commons-lib/util/strings.ts';
import { ACT_SECTIONS } from '@pins/peas-row-commons-database/src/seed/static_data/act-sections.ts';
import { DECISION_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/decision-type.ts';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/procedures.ts';
import { LEGACY_ACT_SECTIONS } from '@pins/peas-row-commons-database/src/seed/static_data/legacy/act-sections.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';
import type { EntraGroupMembers } from '#util/entra-groups-types.ts';

function formatValue(value: any) {
	if (typeof value === 'boolean') {
		return booleanToYesNoValue(value);
	}
	return value;
}

const NESTED_SECTIONS: (keyof CaseListFields)[] = ['Dates', 'Costs', 'Notes', 'Outcome'];

/**
 * Procedures are sorted in chronologically in ascending order by default from DB.
 *
 * However, we need to add an edge scenario, whereby if two+ procedures are added at
 * the same time and >=1 of them are a Site Visit then they should appear first.
 */
export function sortProceduresChronologically(procedures?: CaseProcedureFields[]) {
	if (!procedures || procedures.length === 0) {
		return [];
	}

	return [...procedures].sort((a, b) => {
		const dateA = new Date(a.createdDate || 0).getTime();
		const dateB = new Date(b.createdDate || 0).getTime();

		if (dateA !== dateB) {
			return dateA - dateB;
		}

		// This only gets run if dates are identical, and if so we push
		// the Site Visit procedures above any of the other ones.
		const isASiteVisit = a.procedureTypeId === PROCEDURES_ID.SITE_VISIT;
		const isBSiteVisit = b.procedureTypeId === PROCEDURES_ID.SITE_VISIT;

		if (isASiteVisit && !isBSiteVisit) return -1;
		if (!isASiteVisit && isBSiteVisit) return 1;

		return 0;
	});
}

/**
 * Maps the Procedures array from the DB into a procedureDetails array.
 *
 * Each procedure becomes an object keyed by unprefixed field names
 * (matching the fieldNames in PROCEDURE_QUESTIONS).
 *
 * Address fields (venues) are mapped to the UI address format.
 *
 * Fields we don't want in the UI (internal IDs, timestamps) are stripped.
 */
export function mapProceduresToArray(procedures: any[]): Record<string, any>[] | undefined {
	if (!procedures || !Array.isArray(procedures) || procedures.length === 0) {
		return undefined;
	}

	/** Fields to strip from each procedure — internal DB fields not needed in the UI */
	const STRIP_FIELDS = ['inspectorId', 'caseId', 'createdAt', 'updatedAt'];

	/** Fields that contain Address objects needing transformation */
	const VENUE_FIELDS = ['hearingVenue', 'inquiryVenue', 'conferenceVenue'];

	/**
	 * Fields that are foreign key IDs pointing to related tables.
	 * The DB returns these as separate objects (e.g. HearingVenue: { line1: ... })
	 * but also has the raw ID field (hearingVenueId). We strip the ID fields
	 * because the venue address object is what we actually display.
	 */
	const VENUE_ID_FIELDS = ['hearingVenueId', 'inquiryVenueId', 'conferenceVenueId'];

	/**
	 * Prisma relation fields that are capitalised objects — we extract data
	 * from these but don't pass them through directly.
	 */
	const RELATION_FIELDS = [
		'Inspector',
		'ProcedureType',
		'ProcedureStatus',
		'SiteVisitType',
		'AdminProcedureType',
		'HearingFormat',
		'InquiryFormat',
		'ConferenceFormat',
		'PreInquiryMeetingFormat',
		'HearingVenue',
		'InquiryVenue',
		'ConferenceVenue',
		'InquiryOrConference'
	];

	return procedures.map((proc) => {
		const mapped: Record<string, any> = {};

		Object.keys(proc).forEach((key) => {
			// Skip internal / relation fields
			if (STRIP_FIELDS.includes(key) || VENUE_ID_FIELDS.includes(key) || RELATION_FIELDS.includes(key)) {
				return;
			}

			const value = proc[key];
			if (value === null || value === undefined) return;

			// Map venue address objects to the UI format
			if (VENUE_FIELDS.includes(key) && typeof value === 'object') {
				mapped[key] = mapAddressDbToViewModel(value);
			} else {
				mapped[key] = formatValue(value);
			}
		});

		/**
		 * Handle the case where venue data comes from Prisma relations
		 * (capitalised) rather than direct fields. This happens because
		 * Prisma includes both the FK (hearingVenueId) and the relation
		 * (HearingVenue: { ... }) in the query result.
		 */
		if (proc.HearingVenue) mapped.hearingVenue = mapAddressDbToViewModel(proc.HearingVenue);
		if (proc.InquiryVenue) mapped.inquiryVenue = mapAddressDbToViewModel(proc.InquiryVenue);
		if (proc.ConferenceVenue) mapped.conferenceVenue = mapAddressDbToViewModel(proc.ConferenceVenue);

		mapped.inspectorId = proc.Inspector?.idpUserId ?? PROCEDURE_CONSTANTS.NOT_ALLOCATED;

		return mapped;
	});
}

/**
 * Takes raw case data and converts into UI usable data format.
 * Converts the nested nature of join tables into a flat object.
 */
export function caseToViewModel(caseRow: CaseListFields, groupMembers: EntraGroupMembers) {
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

	if (caseRow.Abeyance) {
		mergedData.abeyancePeriod = {
			start: caseRow.Abeyance.abeyanceStartDate ?? undefined,
			end: caseRow.Abeyance.abeyanceEndDate ?? undefined
		};

		delete mergedData.Abeyance;
	}

	if (caseRow.Authority) {
		mergedData.authorityId = caseRow.Authority.id;
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

	if (caseRow.CaseOfficer) {
		mergedData.caseOfficerId = caseRow.CaseOfficer.idpUserId;
		delete mergedData.CaseOfficer;
	}

	const inspectors =
		caseRow.Inspectors?.map((inspector) => ({
			...inspector,
			inspectorId: inspector.Inspector.idpUserId
		})) || [];

	const outcomeDetails = mapAndSortDecisions(caseRow.Outcome?.CaseDecisions);

	const sortedProcedures = sortProceduresChronologically(mergedData.Procedures);
	const procedureDetails = mapProceduresToArray(sortedProcedures || []);
	delete mergedData.Procedures;

	const sanitisedData: Record<string, any> = {};
	for (const key in mergedData) {
		if (key !== 'SiteAddress') {
			sanitisedData[key] = formatValue(mergedData[key]);
		}
	}

	const siteAddress = mapAddressDbToViewModel(caseRow.SiteAddress);

	const mappedNotes = mapNotes(caseRow.Notes || [], groupMembers, caseRow.id);

	const objectors = (caseRow.Contacts || []).filter((contact) => contact.contactTypeId === CONTACT_TYPE_ID.OBJECTOR);
	const applicants = (caseRow.Contacts || []).filter(
		(contact) => contact.contactTypeId === CONTACT_TYPE_ID.APPLICANT_APPELLANT
	);
	const genericContacts = (caseRow.Contacts || []).filter(
		(contact) =>
			contact.contactTypeId !== CONTACT_TYPE_ID.OBJECTOR &&
			contact.contactTypeId !== CONTACT_TYPE_ID.APPLICANT_APPELLANT
	);

	const mappedObjectors = mapContacts(objectors, 'objector');
	const mappedApplicants = mapContacts(applicants, 'applicant');
	const mappedContacts = mapContacts(genericContacts, 'contact');

	// Some acts do not have sections so we need to nullish coalesce in that check.
	// We combine act sections with the legacy act sections so that old horizon data
	// is still visible in the UI.
	const act = mergedData.actId
		? [...ACT_SECTIONS, ...LEGACY_ACT_SECTIONS].find(
				(actSection) =>
					actSection.actId === mergedData.actId && (actSection.sectionId ?? null) === (mergedData.sectionId ?? null)
			)
		: undefined;

	return {
		...sanitisedData,
		...mappedNotes,
		siteAddress,
		receivedDateDisplay: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime(),
		inspectorDetails: inspectors,
		objectorDetails: mappedObjectors,
		contactDetails: mappedContacts,
		applicantDetails: mappedApplicants.length ? mappedApplicants : undefined,
		outcomeDetails,
		procedureDetails,
		act: act?.id
	};
}

/**
 * Take the pre-sorted decisions (ascending by created date)
 * and add the bespoke logic to make sure 'Decision' type decisions
 * come last.
 */
export const mapAndSortDecisions = (decisions?: CaseDecisionFields[]) => {
	if (!decisions || decisions.length === 0) {
		return undefined;
	}

	// 1. Get the data into the correct format
	const mappedDecisions = decisions.map((decision) => {
		const isOfficer = decision.decisionMakerTypeId === DECISION_MAKER_TYPE_ID.OFFICER;
		const isInspector = decision.decisionMakerTypeId === DECISION_MAKER_TYPE_ID.INSPECTOR;
		const userId = decision.DecisionMaker?.idpUserId;

		return {
			...decision,
			decisionMakerOfficerId: isOfficer ? userId : undefined,
			decisionMakerInspectorId: isInspector ? userId : undefined
		};
	});

	// 2. Sort the data, keeping chronological order but pushing 'decisions' to the end
	return mappedDecisions.sort((a, b) => {
		const isADecision = a.DecisionType?.id === DECISION_TYPE_ID.DECISION;
		const isBDecision = b.DecisionType?.id === DECISION_TYPE_ID.DECISION;

		if (isADecision && !isBDecision) return 1;
		if (!isADecision && isBDecision) return -1;

		// 3. Decisions at the end are ordered by Outcome Date
		if (isADecision && isBDecision) {
			const aOutcome = a.outcomeDate ? new Date(a.outcomeDate).getTime() : 0;
			const bOutcome = b.outcomeDate ? new Date(b.outcomeDate).getTime() : 0;

			return aOutcome - bOutcome;
		}

		return 0;
	});
};

/**
 * Maps the raw case data into data presented in the UI.
 */
export const mapNotes = (
	unmappedCaseNotes: Omit<CaseNoteFields, 'Case'>[],
	groupMembers: EntraGroupMembers,
	caseId: string
) => {
	// Sort the cases first so that they are in descending order by creation date.
	const caseNotes = [...unmappedCaseNotes].sort((a: any, b: any) => b.createdAt - a.createdAt);

	return {
		caseNotes: caseNotes.map((caseNote) => {
			const user = groupMembers.allUsers.find((member) => member.id === caseNote.Author.idpUserId);

			return {
				date: dateISOStringToDisplayDate(caseNote.createdAt),
				dayOfWeek: getDayFromISODate(caseNote.createdAt),
				time: dateISOStringToDisplayTime12hr(caseNote.createdAt),
				commentText: nl2br(caseNote.comment),
				truncatedCommentText: nl2br(truncateComment(caseNote.comment, `/cases/${caseId}/case-notes`)),
				userName: user?.displayName || caseNote.Author.idpUserId || 'Unknown' // Attempts to find the user in entra, otherwise falls back to plain text 'idpUserId' then finally just 'Unknown'
			};
		})
	};
};
