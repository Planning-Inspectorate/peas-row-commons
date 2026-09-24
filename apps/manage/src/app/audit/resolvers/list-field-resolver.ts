import type { RelatedCase } from '@pins/peas-row-commons-database/src/client/client.ts';
import { sortLinkedCases } from '@pins/peas-row-commons-lib/util/case-sorting.ts';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import type { LinkedCaseAuditSource, LinkedCaseDetailInput } from '../../views/cases/view/types.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import type { AuditEntry } from '../types.ts';

type LinkedCaseGroupMember = {
	caseId: string;
	isLead: boolean;
};

type LinkedCaseGroupEntry = [string, LinkedCaseGroupMember];

/**
 * Builds a normalized linked-case group Map, always including a `self` entry
 * (the case the group is centred on) plus the given members.
 */
function toLinkedCaseGroup(
	self: LinkedCaseGroupMember,
	members: LinkedCaseAuditSource[]
): Map<string, LinkedCaseGroupMember> {
	return new Map<string, LinkedCaseGroupMember>([
		[self.caseId, self],
		// caseId included as a key as well as a value so we can have fast lookups by ID
		...members.map((lc): LinkedCaseGroupEntry => [lc.caseId, { caseId: lc.caseId, isLead: lc.isLead }])
	]);
}

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

type LinkedCasesReferenceMap = { id: string; reference: string }[];
type LinkedCaseSnapshot = { reference: string; isLead: boolean }[];

type ResolveLinkedCaseGroupEntryParams = {
	/** The case currently being considered for an audit entry (may or may not be `caseId`). */
	affectedCaseId: string;
	/** The case being edited - the one the whole group change originates from. */
	caseId: string;
	/** The user performing the edit, recorded on any resulting audit entry. */
	userId: string | undefined;
	/** Whether `affectedCaseId` was part of a "real" (size > 1) old group. */
	isInOldGroup: boolean;
	/** Whether `affectedCaseId` is part of the new group. */
	isInNewGroup: boolean;
	/** Whether the previously-real old group has collapsed down to just the edited case. */
	isGroupCollapsedToSelf: boolean;
	/** Whether the new group has more than one member, i.e. is a "real" group. */
	newGroupHasMultipleMembers: boolean;
	/** Full serialized snapshot of the edited case's old group, for deletion metadata. */
	oldSnapshot: LinkedCaseSnapshot;
	/** Full serialized snapshot of the new group, for addition/update metadata. */
	newSnapshot: LinkedCaseSnapshot;
	/** The old-group snapshot relevant to `affectedCaseId` - may be the merged-in lead's
	 * prior group instead of the edited case's, so updates/deletions diff against the
	 * correct prior state. */
	relevantOldSnapshot: LinkedCaseSnapshot;
};

/**
 * Decides the single audit entry (if any) for one case affected by a
 * linked-case group change. Uses early returns, ordered from most to least
 * specific:
 *   1. The edited case itself, when the whole group collapsed to just it.
 *   2. Any case that dropped out of the new group entirely.
 *   3. Nothing, if the case isn't part of a "real" new group.
 *   4. Otherwise, an update (case was already linked) or an addition
 *      (case is newly linked).
 */
function resolveLinkedCaseGroupEntry({
	affectedCaseId,
	caseId,
	userId,
	isInOldGroup,
	isInNewGroup,
	isGroupCollapsedToSelf,
	newGroupHasMultipleMembers,
	oldSnapshot,
	newSnapshot,
	relevantOldSnapshot
}: ResolveLinkedCaseGroupEntryParams): AuditEntry | null {
	// The edited case (caseId) is always synthetically present in both groups as a
	// placeholder, so it never satisfies "isInOldGroup && !isInNewGroup" below even
	// when every other linked case has been removed. Handle that collapse here so
	// the edited case still gets its own deletion entry.
	if (isGroupCollapsedToSelf && affectedCaseId === caseId) {
		return {
			caseId: affectedCaseId,
			action: AUDIT_ACTIONS.LINKED_CASE_GROUP_DELETED,
			userId,
			metadata: { fieldName: 'linked cases', oldLinkedCases: oldSnapshot }
		};
	}

	// Standard deletion: in old group but not in new
	if (isInOldGroup && !isInNewGroup) {
		return {
			caseId: affectedCaseId,
			action: AUDIT_ACTIONS.LINKED_CASE_GROUP_DELETED,
			userId,
			metadata: { fieldName: 'linked cases', oldLinkedCases: relevantOldSnapshot }
		};
	}

	// Defensive logic check - only represents saving an unchanged empty linked case field.
	if (!isInNewGroup || !newGroupHasMultipleMembers) {
		return null;
	}

	// Standard update: in both old and new groups
	if (isInOldGroup) {
		return {
			caseId: affectedCaseId,
			action: AUDIT_ACTIONS.LINKED_CASE_GROUP_UPDATED,
			userId,
			metadata: { fieldName: 'linked cases', oldLinkedCases: relevantOldSnapshot, newLinkedCases: newSnapshot }
		};
	}

	// Standard addition: not in old group but in new
	return {
		caseId: affectedCaseId,
		action: AUDIT_ACTIONS.LINKED_CASE_GROUP_ADDED,
		userId,
		metadata: { fieldName: 'linked cases', newLinkedCases: newSnapshot }
	};
}

/**
 * Compares old and new linked-case groups and returns audit entries
 * (LINKED_CASE_GROUP_ADDED / _UPDATED / _DELETED) for every affected case.
 *
 * - A case still in the final group (size > 1) gets a GROUP_UPDATED or
 *   GROUP_ADDED entry, depending on whether it was already linked.
 * - A case removed from the final group gets a GROUP_DELETED entry.
 * - If the final group collapses to a single unlinked case, every case
 *   (including the edited one) gets a GROUP_DELETED entry.
 *
 * `mergedLeadOldGroup` handles the case where this edit merges `caseId` into
 * an already-established lead's group. Without it, that lead's pre-existing
 * children would look like brand new additions (they aren't in `caseId`'s
 * own old group) instead of updates to their real prior group.
 */
export function resolveLinkedCaseAudits(
	caseId: string,
	userId: string | undefined,
	linkedCasesReferenceMap: LinkedCasesReferenceMap,
	oldLinkedCases: LinkedCaseAuditSource[],
	newLinkedCases: LinkedCaseDetailInput[],
	mergedLeadOldGroup?: { leadCaseId: string; members: LinkedCaseAuditSource[] }
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	// Build normalized groups that always include the current case
	const oldGroup = toLinkedCaseGroup({ caseId, isLead: !oldLinkedCases.some((lc) => lc.isLead) }, oldLinkedCases);

	// When this edit merges the case being edited into a pre-existing lead case's
	// group, that lead's own prior group is tracked separately here so its members
	// get an accurate LINKED_CASE_GROUP_UPDATED instead of being wrongly reported
	// as brand new additions.
	const mergedOldGroup = mergedLeadOldGroup
		? toLinkedCaseGroup({ caseId: mergedLeadOldGroup.leadCaseId, isLead: true }, mergedLeadOldGroup.members)
		: undefined;

	const leadLinkedCase = newLinkedCases.find((lc) => lc.linkedCaseIsLead === BOOLEAN_OPTIONS.YES);
	const newGroup = new Map<string, LinkedCaseGroupMember>([
		[caseId, { caseId, isLead: !leadLinkedCase && newLinkedCases.length > 0 }],
		...newLinkedCases.map((lc): LinkedCaseGroupEntry => [
			lc.linkedCaseId,
			{ caseId: lc.linkedCaseId, isLead: lc.linkedCaseIsLead === BOOLEAN_OPTIONS.YES }
		])
	]);

	const serializeGroup = (group: Map<string, LinkedCaseGroupMember>) =>
		Array.from(group.values()).map((member) => ({
			reference: linkedCasesReferenceMap.find((ref) => ref.id === member.caseId)?.reference ?? member.caseId,
			isLead: member.isLead
		}));

	const oldSnapshot = serializeGroup(oldGroup);
	const newSnapshot = serializeGroup(newGroup);
	const mergedOldSnapshot = mergedOldGroup ? serializeGroup(mergedOldGroup) : undefined;

	// Compare sorted copies to avoid false-positive updated audit log caused by order.
	const groupsAreEqual = JSON.stringify(sortLinkedCases(oldSnapshot)) === JSON.stringify(sortLinkedCases(newSnapshot));
	if (groupsAreEqual) {
		return [];
	}

	const affectedCaseIds = new Set([...oldGroup.keys(), ...newGroup.keys(), ...(mergedOldGroup?.keys() ?? [])]);
	// A group of size 1 is just the case itself with no links, so it's not "real".
	const primaryOldGroupIsReal = oldGroup.size > 1;
	const mergedOldGroupIsReal = (mergedOldGroup?.size ?? 0) > 1;
	const newGroupHasMultipleMembers = newGroup.size > 1;
	const isGroupCollapsedToSelf = primaryOldGroupIsReal && !newGroupHasMultipleMembers;

	for (const affectedCaseId of affectedCaseIds) {
		const isInNewGroup = newGroup.has(affectedCaseId);
		const isInPrimaryOldGroup = primaryOldGroupIsReal && oldGroup.has(affectedCaseId);
		const isInMergedOldGroup = mergedOldGroupIsReal && (mergedOldGroup?.has(affectedCaseId) ?? false);
		const isInOldGroup = isInPrimaryOldGroup || isInMergedOldGroup;
		// A case only present in the merged-in lead's own prior group (not the
		// primary old group) should be diffed against its real prior group, not the
		// edited case's - otherwise it would look like an unrelated brand new addition.
		const relevantOldSnapshot =
			isInMergedOldGroup && !isInPrimaryOldGroup ? (mergedOldSnapshot as typeof oldSnapshot) : oldSnapshot;

		const entry = resolveLinkedCaseGroupEntry({
			affectedCaseId,
			caseId,
			userId,
			isInOldGroup,
			isInNewGroup,
			isGroupCollapsedToSelf,
			newGroupHasMultipleMembers,
			oldSnapshot,
			newSnapshot,
			relevantOldSnapshot
		});
		if (entry) {
			entries.push(entry);
		}
	}

	return entries;
}
