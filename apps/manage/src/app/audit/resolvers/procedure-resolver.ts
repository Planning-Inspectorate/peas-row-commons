import type { AuditEntry } from '../types.ts';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import {
	PROCEDURES,
	PROCEDURE_STATUSES,
	PROCEDURE_EVENT_FORMATS,
	INQUIRY_OR_CONFERENCES,
	ADMIN_PROCEDURES,
	SITE_VISITS
} from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';
import { formatAddress, formatDate, formatNumber } from '@pins/peas-row-commons-lib/util/audit-formatters.ts';

export type ProcedureWithRelations = Prisma.ProcedureGetPayload<{
	include: {
		ProcedureType: true;
		ProcedureStatus: true;
		Inspector: true;
		HearingFormat: true;
		InquiryFormat: true;
		ConferenceFormat: true;
		PreInquiryMeetingFormat: true;
		InquiryOrConference: true;
		HearingVenue: true;
		InquiryVenue: true;
		ConferenceVenue: true;
		AdminProcedureType: true;
		SiteVisitType: true;
	};
}>;

// ─── Field definitions ───────────────────────────────────────────────────────

/**
 * Procedure detail fields that should be individually audited.
 * Maps the field key (as it appears in the form data and on the DB model)
 * to the human-readable display name for the audit trail.
 */
const PROCEDURE_DETAIL_FIELDS: { key: string; displayName: string; type: 'date' | 'number' }[] = [
	// Common
	{ key: 'siteVisitDate', displayName: 'site visit date', type: 'date' },
	{ key: 'caseOfficerVerificationDate', displayName: 'case officer verification date', type: 'date' },

	// Hearing
	{ key: 'hearingTargetDate', displayName: 'target hearing date', type: 'date' },
	{ key: 'earliestHearingDate', displayName: 'earliest potential hearing date', type: 'date' },
	{ key: 'confirmedHearingDate', displayName: 'confirmed hearing date', type: 'date' },
	{ key: 'hearingClosedDate', displayName: 'date hearing closed', type: 'date' },
	{ key: 'hearingDateNotificationDate', displayName: 'date parties notified of hearing date', type: 'date' },
	{ key: 'hearingVenueNotificationDate', displayName: 'date parties notified of hearing venue', type: 'date' },
	{ key: 'partiesNotifiedOfHearingDate', displayName: 'date parties must be notified of hearing', type: 'date' },
	{ key: 'hearingPreparationTimeDays', displayName: 'hearing preparation time (days)', type: 'number' },
	{ key: 'hearingTravelTimeDays', displayName: 'hearing travel time (days)', type: 'number' },
	{ key: 'hearingSittingTimeDays', displayName: 'hearing sitting time (days)', type: 'number' },
	{ key: 'hearingReportingTimeDays', displayName: 'hearing reporting time (days)', type: 'number' },

	// Inquiry
	{ key: 'inquiryTargetDate', displayName: 'inquiry target date', type: 'date' },
	{ key: 'earliestInquiryDate', displayName: 'earliest potential inquiry date', type: 'date' },
	{ key: 'confirmedInquiryDate', displayName: 'confirmed inquiry date', type: 'date' },
	{ key: 'inquiryClosedDate', displayName: 'date inquiry closed', type: 'date' },
	{ key: 'inquiryDateNotificationDate', displayName: 'date parties notified of inquiry date', type: 'date' },
	{ key: 'inquiryVenueNotificationDate', displayName: 'date parties notified of inquiry venue', type: 'date' },
	{ key: 'partiesNotifiedOfInquiryDate', displayName: 'date parties must be notified of inquiry', type: 'date' },
	{ key: 'inquiryPreparationTimeDays', displayName: 'inquiry preparation time (days)', type: 'number' },
	{ key: 'inquiryTravelTimeDays', displayName: 'inquiry travel time (days)', type: 'number' },
	{ key: 'inquirySittingTimeDays', displayName: 'inquiry sitting time (days)', type: 'number' },
	{ key: 'inquiryReportingTimeDays', displayName: 'inquiry reporting time (days)', type: 'number' },

	// Conference / pre-inquiry
	{ key: 'conferenceDate', displayName: 'case management conference date', type: 'date' },
	{ key: 'conferenceNoteSentDate', displayName: 'case management conference note sent', type: 'date' },
	{ key: 'preInquiryMeetingDate', displayName: 'pre inquiry meeting date', type: 'date' },
	{ key: 'preInquiryNoteSentDate', displayName: 'pre inquiry meeting note sent', type: 'date' },

	// Document dates
	{ key: 'proofsOfEvidenceReceivedDate', displayName: 'proofs of evidence received', type: 'date' },
	{ key: 'statementsOfCaseReceivedDate', displayName: 'statements of case received', type: 'date' },
	{ key: 'inHouseDate', displayName: 'in house date', type: 'date' },
	{ key: 'offerForWrittenRepresentationsDate', displayName: 'date offer for written representations', type: 'date' },
	{ key: 'deadlineForConsentDate', displayName: 'deadline for consent', type: 'date' }
];

/**
 * Procedure relation fields that store a foreign key ID but need
 * display name resolution from a static lookup table.
 */
const PROCEDURE_RELATION_LOOKUPS: {
	oldRelation: string;
	newKey: string;
	displayName: string;
	lookupTable: { id: string; displayName: string }[];
}[] = [
	{
		oldRelation: 'HearingFormat',
		newKey: 'hearingFormatId',
		displayName: 'hearing type',
		lookupTable: PROCEDURE_EVENT_FORMATS
	},
	{
		oldRelation: 'InquiryFormat',
		newKey: 'inquiryFormatId',
		displayName: 'inquiry type',
		lookupTable: PROCEDURE_EVENT_FORMATS
	},
	{
		oldRelation: 'ConferenceFormat',
		newKey: 'conferenceFormatId',
		displayName: 'case management conference type',
		lookupTable: PROCEDURE_EVENT_FORMATS
	},
	{
		oldRelation: 'PreInquiryMeetingFormat',
		newKey: 'preInquiryMeetingFormatId',
		displayName: 'pre inquiry meeting format',
		lookupTable: PROCEDURE_EVENT_FORMATS
	},
	{
		oldRelation: 'InquiryOrConference',
		newKey: 'inquiryOrConferenceId',
		displayName: 'pre inquiry meeting or case management conference',
		lookupTable: INQUIRY_OR_CONFERENCES
	},
	{
		oldRelation: 'AdminProcedureType',
		newKey: 'adminProcedureType',
		displayName: 'admin procedure type',
		lookupTable: ADMIN_PROCEDURES
	},
	{
		oldRelation: 'SiteVisitType',
		newKey: 'siteVisitTypeId',
		displayName: 'type of site visit',
		lookupTable: SITE_VISITS
	}
];

/**
 * Procedure venue fields that store address objects.
 */
const PROCEDURE_VENUE_FIELDS: { oldRelation: string; newKey: string; displayName: string }[] = [
	{ oldRelation: 'HearingVenue', newKey: 'hearingVenue', displayName: 'hearing venue' },
	{ oldRelation: 'InquiryVenue', newKey: 'inquiryVenue', displayName: 'inquiry venue' },
	{ oldRelation: 'ConferenceVenue', newKey: 'conferenceVenue', displayName: 'case management conference venue' }
];

// ─── Shared context for sub-field checkers ───────────────────────────────────

interface ProcedureAuditContext {
	caseId: string;
	userId: string | undefined;
	procedureName: string;
	procedureStatus: string;
}

// ─── Sub-field checkers ──────────────────────────────────────────────────────

/**
 * Checks if the procedure type has changed.
 */
function checkTypeChange(
	oldProc: ProcedureWithRelations,
	newProc: Record<string, unknown>,
	ctx: ProcedureAuditContext
): AuditEntry | null {
	const oldTypeId = oldProc.procedureTypeId;
	const newTypeId = newProc.procedureTypeId as string;

	if (oldTypeId === newTypeId) return null;

	return {
		caseId: ctx.caseId,
		action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
		userId: ctx.userId,
		metadata: {
			procedureName: ctx.procedureName,
			procedureStatus: ctx.procedureStatus,
			fieldName: 'type',
			oldValue: PROCEDURES.find((p) => p.id === oldTypeId)?.displayName ?? '-',
			newValue: PROCEDURES.find((p) => p.id === newTypeId)?.displayName ?? '-'
		}
	};
}

/**
 * Checks if the procedure status has changed.
 */
function checkStatusChange(
	oldProc: ProcedureWithRelations,
	newProc: Record<string, unknown>,
	ctx: ProcedureAuditContext
): AuditEntry | null {
	const oldStatusId = oldProc.procedureStatusId;
	const newStatusId = newProc.procedureStatusId as string;

	if (oldStatusId === newStatusId) return null;

	return {
		caseId: ctx.caseId,
		action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
		userId: ctx.userId,
		metadata: {
			procedureName: ctx.procedureName,
			procedureStatus: ctx.procedureStatus,
			fieldName: 'status',
			oldValue: PROCEDURE_STATUSES.find((s) => s.id === oldStatusId)?.displayName ?? '-',
			newValue: PROCEDURE_STATUSES.find((s) => s.id === newStatusId)?.displayName ?? '-'
		}
	};
}

/**
 * Checks if the procedure inspector has changed.
 * Normalises the NOT_ALLOCATED constant to null to avoid false positives.
 */
function checkInspectorChange(
	oldProc: ProcedureWithRelations,
	newProc: Record<string, unknown>,
	ctx: ProcedureAuditContext,
	userDisplayNameMap: Map<string, string>
): AuditEntry | null {
	const oldInspectorId = oldProc.Inspector?.idpUserId ?? null;
	const rawNewInspectorId = (newProc.inspectorId as string | null) ?? null;
	const newInspectorId = rawNewInspectorId === PROCEDURE_CONSTANTS.NOT_ALLOCATED ? null : rawNewInspectorId;

	if (oldInspectorId === newInspectorId) return null;

	return {
		caseId: ctx.caseId,
		action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
		userId: ctx.userId,
		metadata: {
			procedureName: ctx.procedureName,
			procedureStatus: ctx.procedureStatus,
			fieldName: 'inspector',
			oldValue: oldInspectorId ? (userDisplayNameMap.get(oldInspectorId) ?? oldInspectorId) : '-',
			newValue: newInspectorId ? (userDisplayNameMap.get(newInspectorId) ?? newInspectorId) : '-'
		}
	};
}

/**
 * Checks all scalar detail fields (dates and numbers) for changes.
 * Returns an entry for each field that has changed.
 */
function checkDetailFieldChanges(
	oldProc: ProcedureWithRelations,
	newProc: Record<string, unknown>,
	ctx: ProcedureAuditContext
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	for (const field of PROCEDURE_DETAIL_FIELDS) {
		const oldRawVal = oldProc[field.key as keyof typeof oldProc];
		const newRawVal = newProc[field.key];

		const oldVal = field.type === 'date' ? formatDate(oldRawVal as Date | null) : formatNumber(oldRawVal);
		const newVal = field.type === 'date' ? formatDate(newRawVal as string | null) : formatNumber(newRawVal);

		if (oldVal !== newVal) {
			entries.push({
				caseId: ctx.caseId,
				action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
				userId: ctx.userId,
				metadata: {
					procedureName: ctx.procedureName,
					procedureStatus: ctx.procedureStatus,
					fieldName: field.displayName,
					oldValue: oldVal,
					newValue: newVal
				}
			});
		}
	}

	return entries;
}

/**
 * Checks all relation fields (formats, sub-types, lookups) for changes.
 * Resolves foreign key IDs to display names from static reference data.
 * Returns an entry for each relation that has changed.
 */
function checkRelationFieldChanges(
	oldProc: ProcedureWithRelations,
	newProc: Record<string, unknown>,
	ctx: ProcedureAuditContext
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	for (const rel of PROCEDURE_RELATION_LOOKUPS) {
		const oldRelObj = oldProc[rel.oldRelation as keyof typeof oldProc] as { id: string; displayName: string } | null;
		const oldDisplay = oldRelObj?.displayName ?? '-';

		const newId = newProc[rel.newKey] as string | null;
		const newDisplay = newId ? (rel.lookupTable.find((item) => item.id === newId)?.displayName ?? '-') : '-';

		if (oldDisplay !== newDisplay) {
			entries.push({
				caseId: ctx.caseId,
				action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
				userId: ctx.userId,
				metadata: {
					procedureName: ctx.procedureName,
					procedureStatus: ctx.procedureStatus,
					fieldName: rel.displayName,
					oldValue: oldDisplay,
					newValue: newDisplay
				}
			});
		}
	}

	return entries;
}

/**
 * Checks all venue address fields for changes.
 * Compares DB-shaped addresses against form-shaped addresses.
 * Returns an entry for each venue that has changed.
 */
function checkVenueFieldChanges(
	oldProc: ProcedureWithRelations,
	newProc: Record<string, unknown>,
	ctx: ProcedureAuditContext
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	for (const venue of PROCEDURE_VENUE_FIELDS) {
		const oldAddress = formatAddress(
			oldProc[venue.oldRelation as keyof typeof oldProc] as Record<string, unknown> | null
		);
		const newAddress = formatAddress(newProc[venue.newKey] as Record<string, unknown> | null);

		if (oldAddress !== newAddress) {
			entries.push({
				caseId: ctx.caseId,
				action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
				userId: ctx.userId,
				metadata: {
					procedureName: ctx.procedureName,
					procedureStatus: ctx.procedureStatus,
					fieldName: venue.displayName,
					oldValue: oldAddress,
					newValue: newAddress
				}
			});
		}
	}

	return entries;
}

// ─── Main resolver ───────────────────────────────────────────────────────────

/**
 * Compares old and new procedure lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Procedures have stable frontend-generated GUIDs used for upserts in
 * `handleProcedureDetails`, so we diff by ID.
 *
 * The scenarios doc specifies that the procedure label in the audit trail
 * includes both the type and status: "Procedure (Hearing(active))".
 *
 * Sub-fields compared:
 *   - type (procedureTypeId → resolved from PROCEDURES)
 *   - status (procedureStatusId → resolved from PROCEDURE_STATUSES)
 *   - inspector (inspectorId → resolved from userDisplayNameMap)
 *   - all date/numeric detail fields (hearingTargetDate, etc.)
 *   - all relation fields (hearingFormatId, inquiryOrConferenceId, etc.)
 *   - all venue addresses (hearingVenue, inquiryVenue, conferenceVenue)
 */
export function resolveProcedureAudits(
	caseId: string,
	userId: string | undefined,
	oldProcedures: ProcedureWithRelations[],
	newProcedures: Record<string, unknown>[],
	userDisplayNameMap: Map<string, string>
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	const oldById = new Map(oldProcedures.map((p) => [p.id, p]));
	const newById = new Map(newProcedures.map((p) => [p.id as string, p]));

	// Added — ID in new but not in old
	for (const [id, newProc] of newById) {
		if (!oldById.has(id)) {
			const typeName = PROCEDURES.find((p) => p.id === newProc.procedureTypeId)?.displayName ?? '-';
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.PROCEDURE_ADDED,
				userId,
				metadata: { procedureName: typeName }
			});
		}
	}

	// Deleted — ID in old but not in new
	for (const [id, oldProc] of oldById) {
		if (!newById.has(id)) {
			const typeName = oldProc.ProcedureType?.displayName ?? '-';
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.PROCEDURE_DELETED,
				userId,
				metadata: { procedureName: typeName }
			});
		}
	}

	// Updated — ID in both, check all sub-fields
	for (const [id, newProc] of newById) {
		const oldProc = oldById.get(id);
		if (!oldProc) continue;

		const ctx: ProcedureAuditContext = {
			caseId,
			userId,
			procedureName: oldProc.ProcedureType?.displayName ?? '-',
			procedureStatus: oldProc.ProcedureStatus?.displayName ?? '-'
		};

		// Header fields
		const headerChecks = [
			checkTypeChange(oldProc, newProc, ctx),
			checkStatusChange(oldProc, newProc, ctx),
			checkInspectorChange(oldProc, newProc, ctx, userDisplayNameMap)
		];

		for (const entry of headerChecks) {
			if (entry) entries.push(entry);
		}

		// Detail fields (dates and numbers)
		entries.push(...checkDetailFieldChanges(oldProc, newProc, ctx));

		// Relation fields (formats, sub-types, lookups)
		entries.push(...checkRelationFieldChanges(oldProc, newProc, ctx));

		// Venue addresses
		entries.push(...checkVenueFieldChanges(oldProc, newProc, ctx));
	}

	return entries;
}
