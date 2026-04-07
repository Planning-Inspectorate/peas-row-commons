import type { AuditEntry } from '../types.ts';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import {
	DECISION_TYPES,
	DECISION_MAKER_TYPES,
	OUTCOMES
} from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { formatDate } from '@pins/peas-row-commons-lib/util/audit-formatters.ts';

export type DecisionWithRelations = Prisma.CaseDecisionGetPayload<{
	include: { DecisionType: true; DecisionMakerType: true; DecisionMaker: true; Outcome: true };
}>;

// ─── Display helpers ─────────────────────────────────────────────────────────

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

// ─── Shared context for sub-field checkers ───────────────────────────────────

interface OutcomeAuditContext {
	caseId: string;
	userId: string | undefined;
	outcomeName: string;
}

// ─── Sub-field checkers ──────────────────────────────────────────────────────

/**
 * Checks if the decision type has changed.
 */
function checkTypeChange(
	oldDec: DecisionWithRelations,
	newDec: Record<string, unknown>,
	ctx: OutcomeAuditContext
): AuditEntry | null {
	const oldTypeId = oldDec.decisionTypeId;
	const newTypeId = newDec.decisionTypeId as string;

	if (oldTypeId === newTypeId) return null;

	return {
		caseId: ctx.caseId,
		action: AUDIT_ACTIONS.OUTCOME_UPDATED,
		userId: ctx.userId,
		metadata: {
			outcomeName: ctx.outcomeName,
			fieldName: 'type',
			oldValue: oldDec.DecisionType?.displayName ?? '-',
			newValue: DECISION_TYPES.find((t) => t.id === newTypeId)?.displayName ?? '-'
		}
	};
}

/**
 * Checks if the originator (decision maker type + person) has changed.
 * Combines the maker type name with the user's display name.
 */
function checkOriginatorChange(
	oldDec: DecisionWithRelations,
	newDec: Record<string, unknown>,
	ctx: OutcomeAuditContext,
	userDisplayNameMap: Map<string, string>
): AuditEntry | null {
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

	if (oldOriginatorDisplay === newOriginatorDisplay) return null;

	return {
		caseId: ctx.caseId,
		action: AUDIT_ACTIONS.OUTCOME_UPDATED,
		userId: ctx.userId,
		metadata: {
			outcomeName: ctx.outcomeName,
			fieldName: 'originator',
			oldValue: oldOriginatorDisplay,
			newValue: newOriginatorDisplay
		}
	};
}

/**
 * Checks if the outcome selection (or its condition comments) has changed.
 */
function checkOutcomeSelectionChange(
	oldDec: DecisionWithRelations,
	newDec: Record<string, unknown>,
	ctx: OutcomeAuditContext
): AuditEntry | null {
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

	if (oldOutcomeDisplay === newOutcomeDisplay) return null;

	return {
		caseId: ctx.caseId,
		action: AUDIT_ACTIONS.OUTCOME_UPDATED,
		userId: ctx.userId,
		metadata: {
			outcomeName: ctx.outcomeName,
			fieldName: 'outcome',
			oldValue: oldOutcomeDisplay,
			newValue: newOutcomeDisplay
		}
	};
}

/**
 * Checks if the outcome date has changed.
 */
function checkOutcomeDateChange(
	oldDec: DecisionWithRelations,
	newDec: Record<string, unknown>,
	ctx: OutcomeAuditContext
): AuditEntry | null {
	const oldDate = formatDate(oldDec.outcomeDate);
	const newDate = formatDate(newDec.outcomeDate as string | null);

	if (oldDate === newDate) return null;

	return {
		caseId: ctx.caseId,
		action: AUDIT_ACTIONS.OUTCOME_UPDATED,
		userId: ctx.userId,
		metadata: {
			outcomeName: ctx.outcomeName,
			fieldName: 'outcome date',
			oldValue: oldDate,
			newValue: newDate
		}
	};
}

/**
 * Checks if the received date has changed.
 */
function checkReceivedDateChange(
	oldDec: DecisionWithRelations,
	newDec: Record<string, unknown>,
	ctx: OutcomeAuditContext
): AuditEntry | null {
	const oldDate = formatDate(oldDec.decisionReceivedDate);
	const newDate = formatDate(newDec.decisionReceivedDate as string | null);

	if (oldDate === newDate) return null;

	return {
		caseId: ctx.caseId,
		action: AUDIT_ACTIONS.OUTCOME_UPDATED,
		userId: ctx.userId,
		metadata: {
			outcomeName: ctx.outcomeName,
			fieldName: 'received date',
			oldValue: oldDate,
			newValue: newDate
		}
	};
}

// ─── Main resolver ───────────────────────────────────────────────────────────

/**
 * Compares old and new outcome lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Outcomes are stored as `CaseDecision` records within a single `Outcome`
 * parent. Each decision has a stable frontend-generated GUID used for
 * upserts in `handleOutcomes`, so we diff by ID.
 *
 * The display label uses the decision type name (e.g. "Proposal", "Decision").
 *
 * Sub-fields compared (matching the scenarios doc):
 *   - type (decisionTypeId → resolved from DECISION_TYPES)
 *   - originator (decisionMakerTypeId + maker user → "Officer Charlotte Morphet")
 *   - outcome (outcomeId + condition comments → "Granted with conditions: XYZ")
 *   - outcome date
 *   - received date (decisionReceivedDate)
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

	// Updated — ID in both, check all sub-fields
	for (const [id, newDec] of newById) {
		const oldDec = oldById.get(id);
		if (!oldDec) continue;

		const ctx: OutcomeAuditContext = {
			caseId,
			userId,
			outcomeName: oldDec.DecisionType?.displayName ?? '-'
		};

		const checks = [
			checkTypeChange(oldDec, newDec, ctx),
			checkOriginatorChange(oldDec, newDec, ctx, userDisplayNameMap),
			checkOutcomeSelectionChange(oldDec, newDec, ctx),
			checkOutcomeDateChange(oldDec, newDec, ctx),
			checkReceivedDateChange(oldDec, newDec, ctx)
		];

		for (const entry of checks) {
			if (entry) entries.push(entry);
		}
	}

	return entries;
}
