import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms';
import type { Logger } from 'pino';
import type { LinkedCaseAuditSource, LinkedCaseDetailInput } from './types.ts';

/**
 * The relationship changes derived from a submitted `linkedCaseDetails` answer.
 */
export interface LinkedCaseChanges {
	leadCaseId: string | null;
	otherCaseIds: string[];
}

/**
 * The pre-existing group that a newly-designated lead case already led before this
 * edit.
 */
export interface MergedLeadOldGroup {
	leadCaseId: string;
	childCaseIds: string[];
}

/**
 * The true, final state of a linked-case group after `applyLinkedCaseRelationships`
 * has run - including any pre-existing members silently carried over during a merge
 * (see `existingLeadChildIds`/`existingOwnChildIds`) that the submitted
 * `linkedCaseDetails` answer wouldn't otherwise reveal.
 *
 * Callers building audit entries should diff against this rather than the raw
 * submitted answer, so merged-in cases aren't missed (or wrongly reported as removed).
 */
export interface FinalLinkedCaseGroup {
	leadCaseId: string;
	childCaseIds: string[];
	mergedLeadOldGroup?: MergedLeadOldGroup;
}

/**
 * Type guard narrowing an unknown value to a submitted `linkedCaseDetails` row.
 */
function isLinkedCaseDetailInput(value: unknown): value is LinkedCaseDetailInput {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Record<string, unknown>).linkedCaseId === 'string' &&
		typeof (value as Record<string, unknown>).linkedCaseIsLead === 'string'
	);
}

/**
 * Narrows an unknown `linkedCaseDetails` answer value to an array of well-formed rows,
 * filtering out anything that doesn't match the expected shape.
 */
export function getLinkedCaseDetailRows(value: unknown): LinkedCaseDetailInput[] {
	return Array.isArray(value) ? value.filter(isLinkedCaseDetailInput) : [];
}

/**
 * Extracts the intended linked-case relationships from the submitted `linkedCaseDetails`
 * rows, without mutating `rawAnswers`. Must be called before `mapCasePayload` (which
 * strips `linkedCaseDetails` from the flat data).
 *
 * Returns `undefined` when `linkedCaseDetails` was not submitted at all (no relationship
 * changes to make).
 */
export function extractLinkedCaseChanges(rawAnswers: Record<string, unknown>): LinkedCaseChanges | undefined {
	if (!Object.hasOwn(rawAnswers, 'linkedCaseDetails')) return undefined;

	const rows = getLinkedCaseDetailRows(rawAnswers.linkedCaseDetails);
	const leadRow = rows.find((linkedCase) => yesNoToBoolean(linkedCase.linkedCaseIsLead));

	const otherCaseIds = rows.filter((linkedCase) => linkedCase !== leadRow).map((linkedCase) => linkedCase.linkedCaseId);

	return {
		leadCaseId: leadRow ? leadRow.linkedCaseId : null,
		otherCaseIds
	};
}

/**
 * A case option (as offered in the `linkedCaseId` select), along with its existing
 * `ParentRelationship` (if any) or a count of its own `ChildRelationships`, used to
 * detect cases that already belong to a different linked-case group - either as a
 * child of an existing lead, or as an existing lead itself.
 */
export interface OtherCaseWithParent {
	id: string;
	reference: string;
	ParentRelationship?: { parentCaseId: string } | null;
	_count?: { ChildRelationships: number } | null;
}

/**
 * Builds a lookup of `caseId -> existingLeadCaseId` for every `otherCase` that already
 * belongs to an established linked-case group:
 *   - a case with a `ParentRelationship` maps to its existing parent/lead case id.
 *   - a case with its own `ChildRelationships` maps to itself.
 * Used to block a submitted set of `linkedCaseDetails` from changing the lead case of
 * an existing relationship.
 */
export function buildExistingLeadCaseMap(otherCases: OtherCaseWithParent[]): Map<string, string> {
	const existingLeadCaseMap = new Map<string, string>();

	for (const otherCase of otherCases) {
		if (otherCase.ParentRelationship) {
			existingLeadCaseMap.set(otherCase.id, otherCase.ParentRelationship.parentCaseId);
		} else if (otherCase._count?.ChildRelationships) {
			existingLeadCaseMap.set(otherCase.id, otherCase.id);
		}
	}

	return existingLeadCaseMap;
}

/**
 * Writes the `CaseRelationship` rows for the case being edited (and, when a lead case
 * is designated, for its siblings too) to match `changes`. Done as direct table writes
 * rather than a nested `Case` payload field because:
 *   - relationships are one level deep only, so designating a lead case can require
 *     reparenting *other* cases (this case's former siblings), not just this case's own row.
 *   - `ParentRelationship` is an optional to-one relation (enforced unique via `childCaseId`
 *     in the DB) - a nested `delete`/`disconnect` would error when none currently exists.
 *
 * `previousParentCaseId` is this case's parent *before* this update (`null` if it had
 * none, e.g. it was previously the lead itself or unlinked).
 *
 * One set of existing relationships is preserved when the group is wiped and rebuilt:
 *   - when `leadCaseId` designates an existing, separate case as lead, that case's own
 *     existing children (siblings not explicitly listed in this edit, e.g. because they
 *     weren't touched by whichever case's edit screen this update came from) - see
 *     `existingLeadChildIds`.
 *
 * Returns the resulting `FinalLinkedCaseGroup` (the true final membership, including
 * any silently-merged-in cases) so callers can build accurate audit entries from it
 * instead of the raw submitted answer.
 */
export async function applyLinkedCaseRelationships(
	$tx: Prisma.TransactionClient,
	caseId: string,
	changes: LinkedCaseChanges,
	previousParentCaseId: string | null
): Promise<FinalLinkedCaseGroup> {
	const { leadCaseId, otherCaseIds } = changes;

	const newParentCaseId = leadCaseId ?? caseId;
	let childCaseIds = leadCaseId ? [caseId, ...otherCaseIds] : otherCaseIds;
	let mergedLeadOldGroup: MergedLeadOldGroup | undefined;

	// Only preserve the designated lead case's other existing children when this case
	// is newly joining that group (previousParentCaseId !== leadCaseId). If this case
	// was already one of that lead's children, the edit screen showed the *complete*
	// sibling list (see resolveLinkedCaseRelationships), so any sibling missing from
	// `otherCaseIds` was deliberately removed by the user, not merely out of view -
	// preserving it here would silently undo that removal.
	const needsLeadChildren = leadCaseId !== null && previousParentCaseId !== leadCaseId;

	if (needsLeadChildren) {
		const existingChildren = await $tx.caseRelationship.findMany({
			where: { parentCaseId: leadCaseId as string },
			select: { parentCaseId: true, childCaseId: true }
		});

		// The lead's true prior membership (minus the case being edited, which was
		// never one of its children). Used as-is for `mergedLeadOldGroup` below, since
		// the audit "old" snapshot must reflect the real previous state even when one
		// of these ids also happens to be explicitly resubmitted via `otherCaseIds`
		// (e.g. a case building a link to an already-established lead can legitimately
		// re-list one of that lead's existing children).
		const existingLeadChildIds = existingChildren
			.map((relationship) => relationship.childCaseId)
			.filter((childCaseId) => childCaseId !== caseId);

		// Only *append* the subset not already part of this edit, so they remain
		// linked instead of being silently dropped when the group is wiped and
		// rebuilt below - ids already in `childCaseIds` don't need appending (and
		// appending them again would create a duplicate `CaseRelationship` row,
		// violating the unique constraint on `childCaseId`).
		const existingLeadChildIdsToAppend = existingLeadChildIds.filter(
			(childCaseId) => !childCaseIds.includes(childCaseId)
		);

		childCaseIds = [...childCaseIds, ...existingLeadChildIdsToAppend];

		// If the designated lead was a genuinely established lead before this edit
		// (it already had its own children) - record its own prior group so callers
		// can build accurate UPDATED audit entries for it and its pre-existing
		// children when this merge is audited. This uses the full, unfiltered
		// `existingLeadChildIds` (not the append-only subset) so a pre-existing
		// child that's also explicitly resubmitted still shows up in the old
		// snapshot instead of being wrongly reported as newly added.
		if (existingLeadChildIds.length) {
			mergedLeadOldGroup = { leadCaseId: leadCaseId as string, childCaseIds: existingLeadChildIds };
		}
	}

	// The root of this case's previous group: its former parent if it had one,
	// otherwise this case itself (it may have been the lead, with its own children).
	const previousRootCaseId = previousParentCaseId ?? caseId;

	// Wipe the previous group and the new target group so the final state is
	// rebuilt from the submitted linkedCaseDetails instead of resurrecting old
	// relationships that were previously removed by the user.
	const rootCaseIdsToWipe = Array.from(new Set([previousRootCaseId, newParentCaseId]));
	await $tx.caseRelationship.deleteMany({
		where: { parentCaseId: { in: rootCaseIdsToWipe } }
	});

	// Clear any parent links for cases that are about to be re-parented.
	const caseIdsToClearParentFor = Array.from(new Set([caseId, ...childCaseIds]));
	await $tx.caseRelationship.deleteMany({
		where: { childCaseId: { in: caseIdsToClearParentFor } }
	});

	if (childCaseIds.length) {
		await $tx.caseRelationship.createMany({
			data: childCaseIds.map((childCaseId) => ({
				parentCaseId: newParentCaseId,
				childCaseId
			}))
		});
	}

	return mergedLeadOldGroup
		? { leadCaseId: newParentCaseId, childCaseIds, mergedLeadOldGroup }
		: { leadCaseId: newParentCaseId, childCaseIds };
}

/**
 * Links a newly created case to its lead case by appending a single
 * `CaseRelationship` row.
 */
export async function linkNewCaseToLead(
	$tx: Prisma.TransactionClient,
	caseId: string,
	leadCaseId: string
): Promise<void> {
	await $tx.caseRelationship.create({
		data: { parentCaseId: leadCaseId, childCaseId: caseId }
	});
}

/**
 * `linkedCaseDetails` is handled entirely via direct `CaseRelationship` writes
 * (see `extractLinkedCaseChanges`/`applyLinkedCaseRelationships`), so it just needs to
 * be removed from the flat data here so it isn't mistaken for a plain `Case` field.
 */
export function stripLinkedCaseDetails(flatData: Record<string, any>) {
	delete flatData.linkedCaseDetails;
}

/**
 * Builds the previous linked-case audit snapshot for the case being edited.
 *
 * Returns the other cases in the old linked group:
 *   - if this case had a parent, the parent is returned as the lead and the
 *     parent's other children are returned as non-lead siblings
 *   - otherwise this case's direct child relationships are returned as non-lead cases
 *
 * The current case itself is intentionally excluded here; it is added by
 * `resolveLinkedCaseAudits` when normalising the old/new groups.
 */
export function buildPreviousLinkedCases(previousValues: Record<string, unknown>): LinkedCaseAuditSource[] {
	const caseId = previousValues.id as string;
	const childRelationships = (previousValues.ChildRelationships as RelationshipRow[]) ?? [];
	const parentRelationship = previousValues.ParentRelationship as
		| {
				id: string;
				ParentCase: {
					id: string;
					reference: string | null;
					ChildRelationships?: RelationshipRow[];
				};
		  }
		| null
		| undefined;

	if (!parentRelationship) {
		return childRelationships.map((rel) => ({
			caseId: rel.ChildCase.id,
			isLead: false
		}));
	}

	const siblings = (parentRelationship.ParentCase.ChildRelationships ?? [])
		.filter((rel) => rel.ChildCase.id !== caseId)
		.map((rel) => ({
			caseId: rel.ChildCase.id,
			isLead: false
		}));

	return [{ caseId: parentRelationship.ParentCase.id, isLead: true }, ...siblings];
}

/**
 * A single `CaseRelationship` join record, joined out to its child case's own
 * identity fields.
 */
interface RelationshipRow {
	id: string;
	ChildCase: { id: string; reference: string | null };
}

/**
 * The subset of a case's fetched fields needed to resolve its full set of
 * linked cases (its own `id`, plus the `ChildRelationships`/`ParentRelationship`
 * join records).
 */
export interface RelationshipCaseRow {
	id: string;
	ChildRelationships?: RelationshipRow[] | null;
	ParentRelationship?: {
		id: string;
		ParentCase: {
			id: string;
			reference: string | null;
			ChildRelationships?: RelationshipRow[] | null;
		};
	} | null;
}

/**
 * A single resolved linked-case relationship.0
 */
export interface ResolvedLinkedCase {
	id: string;
	reference: string | null;
	otherCaseId: string;
	isLead: boolean;
}

/**
 * Resolves the full set of linked cases for `caseRow` from its fetched
 * `CaseRelationship` join records.
 *
 * If `caseRow` has a `ParentRelationship`, it's a child of another case: the
 * parent is the lead, and the parent's other children (`caseRow`'s siblings)
 * are included too. Otherwise, `caseRow`'s own `ChildRelationships` (if any)
 * are its linked cases, none of which are the lead.
 */
export function resolveLinkedCaseRelationships(caseRow: RelationshipCaseRow, logger?: Logger): ResolvedLinkedCase[] {
	if (caseRow.ParentRelationship) {
		if (caseRow.ChildRelationships?.length) {
			logger?.error(
				{ caseId: caseRow.id },
				'Case has both a ParentRelationship and ChildRelationships - a case should only have one. Ignoring ChildRelationships.'
			);
		}

		const parentCase: ResolvedLinkedCase = {
			id: caseRow.ParentRelationship.id,
			reference: caseRow.ParentRelationship.ParentCase.reference,
			otherCaseId: caseRow.ParentRelationship.ParentCase.id,
			isLead: true
		};

		const siblingCases: ResolvedLinkedCase[] = (caseRow.ParentRelationship.ParentCase.ChildRelationships ?? [])
			.filter((relationship) => relationship.ChildCase.id !== caseRow.id)
			.map((relationship) => ({
				id: relationship.id,
				reference: relationship.ChildCase.reference,
				otherCaseId: relationship.ChildCase.id,
				isLead: false
			}));

		return [parentCase, ...siblingCases];
	}

	return (caseRow.ChildRelationships ?? []).map((relationship) => ({
		id: relationship.id,
		reference: relationship.ChildCase.reference,
		otherCaseId: relationship.ChildCase.id,
		isLead: false
	}));
}
