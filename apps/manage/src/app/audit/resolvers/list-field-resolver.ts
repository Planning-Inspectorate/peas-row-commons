import type { RelatedCase } from '@pins/peas-row-commons-database/src/client/client.ts';
import { formatYesNo } from '@pins/peas-row-commons-lib/util/audit-formatters.ts';
import type { LinkedCaseAuditSource, LinkedCaseDetailInput } from '../../views/cases/view/types.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import type { AuditEntry } from '../types.ts';

type LinkedCaseGroupMember = {
	caseId: string;
	isLead: boolean;
};

type LinkedCaseGroupEntry = [string, LinkedCaseGroupMember];

/**
 * Compares old and new related cases and returns audit entries for
 * additions and deletions.
 *
 * Related cases only have a single field (`reference`), so there is no
 * sub-field update scenario. If a user edits an existing reference, the
 * handler (`handleRelatedCases`) does a `deleteMany` + `create` which
 * replaces the entire list. This means an edit appears as a deletion of
 * the old reference and an addition of the new one, which is accurate
 * from an audit perspective — the old reference is no longer related.
 *
 * We diff by stable ID using Maps so that:
 *   - IDs in the new list but not the old → RELATED_CASE_ADDED
 *   - IDs in the old list but not the new → RELATED_CASE_DELETED
 *   - IDs in both with different references → RELATED_CASE_UPDATED
 *   - New items without an ID are brand new additions
 */
export function resolveRelatedCaseAudits(
	caseId: string,
	userId: string | undefined,
	oldRelatedCases: RelatedCase[],
	newRelatedCases: { id?: string; relatedCaseReference: string }[]
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	const oldById = new Map(oldRelatedCases.map((rc) => [rc.id, rc]));
	const newById = new Map(newRelatedCases.filter((rc) => rc.id).map((rc) => [rc.id as string, rc]));

	// New items without an ID are brand new additions
	for (const newCase of newRelatedCases) {
		if (!newCase.id || !oldById.has(newCase.id)) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.RELATED_CASE_ADDED,
				userId,
				metadata: { reference: newCase.relatedCaseReference }
			});
		}
	}

	// Deleted — ID in old but not in new
	for (const [id, oldCase] of oldById) {
		if (!newById.has(id)) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.RELATED_CASE_DELETED,
				userId,
				metadata: { reference: oldCase.reference }
			});
		}
	}

	// Updated — ID in both, check if reference changed
	for (const [id, newCase] of newById) {
		const oldCase = oldById.get(id);
		if (!oldCase) continue;

		if (oldCase.reference !== newCase.relatedCaseReference) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.RELATED_CASE_UPDATED,
				userId,
				metadata: {
					oldValue: oldCase.reference,
					newValue: newCase.relatedCaseReference
				}
			});
		}
	}

	return entries;
}

/**
 * Compares old and new linked cases and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Rules:
 * - Any case still in the final linked group gets LINKED_CASE_UPDATED
 * with old/new linked-case lists, provided the final group contains
 * more than one case.
 * - Any case removed from the final group gets LINKED_CASE_DELETED.
 * - If the final group collapses to a single unlinked case, no list-style
 * update entry is recorded for that remaining case.
 */
export function resolveLinkedCaseAudits(
	caseId: string,
	userId: string | undefined,
	oldLinkedCases: LinkedCaseAuditSource[],
	newLinkedCases: LinkedCaseDetailInput[]
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	// Build normalized groups that always include the current case
	const oldGroup = new Map<string, LinkedCaseGroupMember>([
		[caseId, { caseId, isLead: !oldLinkedCases.some((lc) => lc.isLead) }],
		...oldLinkedCases.map((lc): LinkedCaseGroupEntry => [lc.caseId, { caseId: lc.caseId, isLead: lc.isLead }])
	]);

	const leadLinkedCase = newLinkedCases.find((lc) => formatYesNo(lc.linkedCaseIsLead) === 'Yes');
	const newGroup = new Map<string, LinkedCaseGroupMember>([
		[caseId, { caseId, isLead: !leadLinkedCase }],
		...newLinkedCases.map((lc): LinkedCaseGroupEntry => [
			lc.linkedCaseId,
			{ caseId: lc.linkedCaseId, isLead: formatYesNo(lc.linkedCaseIsLead) === 'Yes' }
		])
	]);

	const affectedCaseIds = new Set([...oldGroup.keys(), ...newGroup.keys()]);
	const serializeGroup = (group: Map<string, LinkedCaseGroupMember>) =>
		Array.from(group.values()).map((m) => ({ caseId: m.caseId, isLead: m.isLead }));

	for (const affectedCaseId of affectedCaseIds) {
		const isInNewGroup = newGroup.has(affectedCaseId);
		const isInOldGroup = oldGroup.has(affectedCaseId);

		if (isInNewGroup && newGroup.size > 1) {
			entries.push({
				caseId: affectedCaseId,
				action: AUDIT_ACTIONS.LINKED_CASE_UPDATED,
				userId,
				metadata: {
					fieldName: 'linked cases',
					oldLinkedCases: serializeGroup(oldGroup),
					newLinkedCases: serializeGroup(newGroup)
				}
			});
		} else if (isInOldGroup) {
			entries.push({
				caseId: affectedCaseId,
				action: AUDIT_ACTIONS.LINKED_CASE_DELETED,
				userId,
				metadata: {
					fieldName: 'linked cases'
				}
			});
		}
	}

	return entries;
}
