import type { AuditEntry } from '../types.ts';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import {
	PROCEDURES,
	PROCEDURE_STATUSES,
	PROCEDURE_EVENT_FORMATS,
	INQUIRY_OR_CONFERENCES,
	ADMIN_PROCEDURES,
	SITE_VISITS,
	DECISION_TYPES,
	DECISION_MAKER_TYPES,
	OUTCOMES
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

export type DecisionWithRelations = Prisma.CaseDecisionGetPayload<{
	include: { DecisionType: true; DecisionMakerType: true; DecisionMaker: true; Outcome: true };
}>;

// ─── Procedure detail fields ─────────────────────────────────────────────────

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
 *
 * `oldRelation` is the capitalised Prisma relation name on the old DB row.
 * `newKey` is the form field name on the new submission.
 * `lookupTable` is the static reference data array to resolve display names.
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
 *
 * `oldRelation` is the capitalised Prisma relation name on the old DB row.
 * `newKey` is the form field name on the new submission (contains the address object).
 */
const PROCEDURE_VENUE_FIELDS: { oldRelation: string; newKey: string; displayName: string }[] = [
	{ oldRelation: 'HearingVenue', newKey: 'hearingVenue', displayName: 'hearing venue' },
	{ oldRelation: 'InquiryVenue', newKey: 'inquiryVenue', displayName: 'inquiry venue' },
	{ oldRelation: 'ConferenceVenue', newKey: 'conferenceVenue', displayName: 'case management conference venue' }
];

// ─── Procedures ──────────────────────────────────────────────────────────────

/**
 * Compares old and new procedure lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Procedures have stable frontend-generated GUIDs used for upserts in
 * `handleProcedureDetails`, so we diff by ID.
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

	// Updated — ID in both, check sub-fields
	for (const [id, newProc] of newById) {
		const oldProc = oldById.get(id);
		if (!oldProc) continue;

		// The label uses the OLD type and status for context,
		// e.g. "Procedure (Hearing(active)) type was updated from hearing to inquiry."
		const procedureName = oldProc.ProcedureType?.displayName ?? '-';
		const procedureStatus = oldProc.ProcedureStatus?.displayName ?? '-';

		// Type changed
		const oldTypeId = oldProc.procedureTypeId;
		const newTypeId = newProc.procedureTypeId as string;

		if (oldTypeId !== newTypeId) {
			const oldType = PROCEDURES.find((p) => p.id === oldTypeId)?.displayName ?? '-';
			const newType = PROCEDURES.find((p) => p.id === newTypeId)?.displayName ?? '-';

			entries.push({
				caseId,
				action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
				userId,
				metadata: {
					procedureName,
					procedureStatus,
					fieldName: 'type',
					oldValue: oldType,
					newValue: newType
				}
			});
		}

		// Status changed
		const oldStatusId = oldProc.procedureStatusId;
		const newStatusId = newProc.procedureStatusId as string;

		if (oldStatusId !== newStatusId) {
			const oldStatus = PROCEDURE_STATUSES.find((s) => s.id === oldStatusId)?.displayName ?? '-';
			const newStatus = PROCEDURE_STATUSES.find((s) => s.id === newStatusId)?.displayName ?? '-';

			entries.push({
				caseId,
				action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
				userId,
				metadata: {
					procedureName,
					procedureStatus,
					fieldName: 'status',
					oldValue: oldStatus,
					newValue: newStatus
				}
			});
		}

		// Inspector changed
		const oldInspectorId = oldProc.Inspector?.idpUserId ?? null;
		const rawNewInspectorId = (newProc.inspectorId as string | null) ?? null;
		const newInspectorId = rawNewInspectorId === PROCEDURE_CONSTANTS.NOT_ALLOCATED ? null : rawNewInspectorId;

		if (oldInspectorId !== newInspectorId) {
			const oldInspector = oldInspectorId ? (userDisplayNameMap.get(oldInspectorId) ?? oldInspectorId) : '-';
			const newInspector = newInspectorId ? (userDisplayNameMap.get(newInspectorId) ?? newInspectorId) : '-';

			entries.push({
				caseId,
				action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
				userId,
				metadata: {
					procedureName,
					procedureStatus,
					fieldName: 'inspector',
					oldValue: oldInspector,
					newValue: newInspector
				}
			});
		}

		// Detail fields — dates and numeric values
		// These are scalar fields on the Procedure model that are edited
		// via the dynamic procedure section detail pages.
		for (const field of PROCEDURE_DETAIL_FIELDS) {
			const oldRawVal = oldProc[field.key as keyof typeof oldProc];
			const newRawVal = newProc[field.key];

			const oldVal = field.type === 'date' ? formatDate(oldRawVal as Date | null) : formatNumber(oldRawVal);

			const newVal = field.type === 'date' ? formatDate(newRawVal as string | null) : formatNumber(newRawVal);

			if (oldVal !== newVal) {
				entries.push({
					caseId,
					action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
					userId,
					metadata: {
						procedureName,
						procedureStatus,
						fieldName: field.displayName,
						oldValue: oldVal,
						newValue: newVal
					}
				});
			}
		}

		// Relation fields — formats, sub-types, and other lookups
		// These are stored as foreign key IDs but need resolving to
		// display names from static reference data tables.
		for (const rel of PROCEDURE_RELATION_LOOKUPS) {
			const oldRelObj = oldProc[rel.oldRelation as keyof typeof oldProc] as { id: string; displayName: string } | null;
			const oldDisplay = oldRelObj?.displayName ?? '-';

			const newId = newProc[rel.newKey] as string | null;
			const newDisplay = newId ? (rel.lookupTable.find((item) => item.id === newId)?.displayName ?? '-') : '-';

			if (oldDisplay !== newDisplay) {
				entries.push({
					caseId,
					action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
					userId,
					metadata: {
						procedureName,
						procedureStatus,
						fieldName: rel.displayName,
						oldValue: oldDisplay,
						newValue: newDisplay
					}
				});
			}
		}

		// Venue addresses — hearing, inquiry, conference
		// These are stored as Address relations on the DB and submitted
		// as address objects from the form.
		for (const venue of PROCEDURE_VENUE_FIELDS) {
			const oldAddress = formatAddress(
				oldProc[venue.oldRelation as keyof typeof oldProc] as Record<string, unknown> | null
			);
			const newAddress = formatAddress(newProc[venue.newKey] as Record<string, unknown> | null);

			if (oldAddress !== newAddress) {
				entries.push({
					caseId,
					action: AUDIT_ACTIONS.PROCEDURE_UPDATED,
					userId,
					metadata: {
						procedureName,
						procedureStatus,
						fieldName: venue.displayName,
						oldValue: oldAddress,
						newValue: newAddress
					}
				});
			}
		}
	}

	return entries;
}

// ─── Outcomes ────────────────────────────────────────────────────────────────

/**
 * Builds the originator display string: "Officer John Doe" or
 * "Inspector John Doe" or "Secretary of State".
 */
function getOriginatorDisplay(
	makerTypeId: string | null | undefined,
	makerUserId: string | null | undefined,
	userDisplayNameMap: Map<string, string>
): string {
	if (!makerTypeId) return '-';

	const makerType = DECISION_MAKER_TYPES.find((t) => t.id === makerTypeId);
	const typeName = makerType?.displayName ?? '-';

	if (!makerUserId) return typeName;

	const userName = userDisplayNameMap.get(makerUserId) ?? makerUserId;
	return `${typeName} ${userName}`;
}

/**
 * Builds the outcome display string, including any conditions comment.
 * e.g. "Allow", "Granted with conditions: XYZ must change", "Other: reason"
 */
function getOutcomeDisplay(
	outcomeId: string | null | undefined,
	grantedComment: string | null | undefined,
	otherComment: string | null | undefined
): string {
	if (!outcomeId) return '-';

	const outcome = OUTCOMES.find((o) => o.id === outcomeId);
	const name = outcome?.displayName ?? '-';

	if (grantedComment) return `${name}: ${grantedComment}`;
	if (otherComment) return `${name}: ${otherComment}`;

	return name;
}

/**
 * Compares old and new outcome lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Outcomes are stored as `CaseDecision` records within a single `Outcome`
 * parent. Each decision has a stable frontend-generated GUID used for
 * upserts in `handleOutcomes`, so we diff by ID.
 */
export function resolveOutcomeAudits(
	caseId: string,
	userId: string | undefined,
	oldDecisions: DecisionWithRelations[],
	newDecisions: Record<string, unknown>[],
	userDisplayNameMap: Map<string, string>
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	const oldById = new Map(oldDecisions.map((d) => [d.id, d]));
	const newById = new Map(newDecisions.map((d) => [d.id as string, d]));

	// Added — ID in new but not in old
	for (const [id, newDec] of newById) {
		if (!oldById.has(id)) {
			const typeName = DECISION_TYPES.find((t) => t.id === newDec.decisionTypeId)?.displayName ?? '-';

			entries.push({
				caseId,
				action: AUDIT_ACTIONS.OUTCOME_ADDED,
				userId,
				metadata: { outcomeName: typeName }
			});
		}
	}

	// Deleted — ID in old but not in new
	for (const [id, oldDec] of oldById) {
		if (!newById.has(id)) {
			const typeName = oldDec.DecisionType?.displayName ?? '-';

			entries.push({
				caseId,
				action: AUDIT_ACTIONS.OUTCOME_DELETED,
				userId,
				metadata: { outcomeName: typeName }
			});
		}
	}

	// Updated — ID in both, check sub-fields
	for (const [id, newDec] of newById) {
		const oldDec = oldById.get(id);
		if (!oldDec) continue;

		// Use the old decision type as the context label
		const outcomeName = oldDec.DecisionType?.displayName ?? '-';

		// Type changed
		const oldTypeId = oldDec.decisionTypeId;
		const newTypeId = newDec.decisionTypeId as string;

		if (oldTypeId !== newTypeId) {
			const oldType = oldDec.DecisionType?.displayName ?? '-';
			const newType = DECISION_TYPES.find((t) => t.id === newTypeId)?.displayName ?? '-';

			entries.push({
				caseId,
				action: AUDIT_ACTIONS.OUTCOME_UPDATED,
				userId,
				metadata: {
					outcomeName,
					fieldName: 'type',
					oldValue: oldType,
					newValue: newType
				}
			});
		}

		// Originator changed (maker type + maker person combined)
		const oldOriginatorDisplay = getOriginatorDisplay(
			oldDec.decisionMakerTypeId,
			oldDec.DecisionMaker?.idpUserId,
			userDisplayNameMap
		);
		const newMakerUserId = (newDec.decisionMakerOfficerId ?? newDec.decisionMakerInspectorId) as string | null;
		const newOriginatorDisplay = getOriginatorDisplay(
			newDec.decisionMakerTypeId as string,
			newMakerUserId,
			userDisplayNameMap
		);

		if (oldOriginatorDisplay !== newOriginatorDisplay) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.OUTCOME_UPDATED,
				userId,
				metadata: {
					outcomeName,
					fieldName: 'originator',
					oldValue: oldOriginatorDisplay,
					newValue: newOriginatorDisplay
				}
			});
		}

		// Outcome changed (outcome selection + condition comments)
		const oldOutcomeDisplay = getOutcomeDisplay(
			oldDec.outcomeId,
			oldDec.grantedWithConditionsComment,
			oldDec.otherComment
		);
		const newOutcomeDisplay = getOutcomeDisplay(
			newDec.outcomeId as string,
			newDec.grantedWithConditionsComment as string,
			newDec.otherComment as string
		);

		if (oldOutcomeDisplay !== newOutcomeDisplay) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.OUTCOME_UPDATED,
				userId,
				metadata: {
					outcomeName,
					fieldName: 'outcome',
					oldValue: oldOutcomeDisplay,
					newValue: newOutcomeDisplay
				}
			});
		}

		// Outcome date changed
		const oldOutcomeDate = formatDate(oldDec.outcomeDate);
		const newOutcomeDate = formatDate(newDec.outcomeDate as string | null);

		if (oldOutcomeDate !== newOutcomeDate) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.OUTCOME_UPDATED,
				userId,
				metadata: {
					outcomeName,
					fieldName: 'outcome date',
					oldValue: oldOutcomeDate,
					newValue: newOutcomeDate
				}
			});
		}

		// Received date changed
		const oldReceivedDate = formatDate(oldDec.decisionReceivedDate);
		const newReceivedDate = formatDate(newDec.decisionReceivedDate as string | null);

		if (oldReceivedDate !== newReceivedDate) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.OUTCOME_UPDATED,
				userId,
				metadata: {
					outcomeName,
					fieldName: 'received date',
					oldValue: oldReceivedDate,
					newValue: newReceivedDate
				}
			});
		}
	}

	return entries;
}
