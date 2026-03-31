import type { AuditEntry } from '../types.ts';
import type { RelatedCase, LinkedCase } from '@pins/peas-row-commons-database/src/client/client.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import { formatBoolean, formatYesNo } from '@pins/peas-row-commons-lib/util/audit-formatters.ts';

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
 * Linked cases have two fields: `reference` and `isLead`. We use
 * `reference` as the identity key for comparison:
 *
 *   - References in the new list but not the old → LINKED_CASE_ADDED
 *   - References in the old list but not the new → LINKED_CASE_DELETED
 *   - References in both → compare sub-fields for changes:
 *       - If `isLead` changed → LINKED_CASE_UPDATED
 */
export function resolveLinkedCaseAudits(
	caseId: string,
	userId: string | undefined,
	oldLinkedCases: LinkedCase[],
	newLinkedCases: { id?: string; linkedCaseReference: string; linkedCaseIsLead: string }[]
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	const oldById = new Map(oldLinkedCases.map((lc) => [lc.id, lc]));
	const newById = new Map(newLinkedCases.filter((lc) => lc.id).map((lc) => [lc.id as string, lc]));

	// Added
	for (const newCase of newLinkedCases) {
		if (!newCase.id || !oldById.has(newCase.id)) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.LINKED_CASE_ADDED,
				userId,
				metadata: { reference: newCase.linkedCaseReference }
			});
		}
	}

	// Deleted
	for (const [id, oldCase] of oldById) {
		if (!newById.has(id)) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.LINKED_CASE_DELETED,
				userId,
				metadata: { reference: oldCase.reference }
			});
		}
	}

	// Updated
	for (const [id, newCase] of newById) {
		const oldCase = oldById.get(id);
		if (!oldCase) continue;

		if (oldCase.reference !== newCase.linkedCaseReference) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.LINKED_CASE_UPDATED,
				userId,
				metadata: {
					entityName: oldCase.reference,
					fieldName: 'linked case reference',
					oldValue: oldCase.reference,
					newValue: newCase.linkedCaseReference
				}
			});
		}

		const oldIsLead = formatBoolean(oldCase.isLead);
		const newIsLead = formatYesNo(newCase.linkedCaseIsLead);

		if (oldIsLead !== newIsLead) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.LINKED_CASE_UPDATED,
				userId,
				metadata: {
					entityName: newCase.linkedCaseReference,
					fieldName: 'lead?',
					oldValue: oldIsLead,
					newValue: newIsLead
				}
			});
		}
	}

	return entries;
}
