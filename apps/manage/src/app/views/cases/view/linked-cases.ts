import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms';
import type { LinkedCaseAuditSource, LinkedCaseDetailInput } from './types.ts';

/**
 * The relationship changes derived from a submitted `linkedCaseDetails` answer.
 */
export interface LinkedCaseChanges {
	leadCaseId: string | null;
	otherCaseIds: string[];
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
 */
export async function applyLinkedCaseRelationships(
	$tx: Prisma.TransactionClient,
	caseId: string,
	changes: LinkedCaseChanges,
	previousParentCaseId: string | null
): Promise<void> {
	const { leadCaseId, otherCaseIds } = changes;

	const newParentCaseId = leadCaseId ?? caseId;
	const childCaseIds = leadCaseId ? [caseId, ...otherCaseIds] : otherCaseIds;

	// The root of this case's previous group: its former parent if it had one,
	// otherwise this case itself (it may have been the lead, with its own children).
	const previousRootCaseId = previousParentCaseId ?? caseId;

	// TODO: HRP-611 make sure audit accurately records changes to linked cases and not all wipes/readditions.
	// Wipe every relationship in both the case's previous group and its new group.
	const rootCaseIdsToWipe = Array.from(new Set([previousRootCaseId, newParentCaseId]));
	await $tx.caseRelationship.deleteMany({ where: { parentCaseId: { in: rootCaseIdsToWipe } } });

	// childCaseId is unique (a case can only have one parent), so clear any existing
	// parent link for every case about to become a child of newParentCaseId - this also
	// covers clearing this case's own previous parent link if it had one, and pulling in
	// a case that previously belonged to a different group entirely.
	const caseIdsToClearParentFor = Array.from(new Set([caseId, ...childCaseIds]));
	await $tx.caseRelationship.deleteMany({ where: { childCaseId: { in: caseIdsToClearParentFor } } });

	if (childCaseIds.length) {
		await $tx.caseRelationship.createMany({
			data: childCaseIds.map((childCaseId) => ({ parentCaseId: newParentCaseId, childCaseId }))
		});
	}
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
 * Adapts the previously-fetched `ChildRelationships`/`ParentRelationship`
 * (`CaseRelationship` join records) into the flat `{ id, reference, isLead }`
 * shape `resolveLinkedCaseAudits` expects.
 */
export function buildPreviousLinkedCases(previousValues: Record<string, unknown>): LinkedCaseAuditSource[] {
	const childRelationships =
		(previousValues.ChildRelationships as { id: string; ChildCase: { id: string; reference: string | null } }[]) ?? [];
	const parentRelationship = previousValues.ParentRelationship as
		{ id: string; ParentCase: { id: string; reference: string | null } } | null | undefined;

	const linkedCases: LinkedCaseAuditSource[] = childRelationships.map((relationship) => ({
		id: relationship.id,
		reference: relationship.ChildCase.id,
		isLead: false
	}));

	if (parentRelationship) {
		linkedCases.push({
			id: parentRelationship.id,
			reference: parentRelationship.ParentCase.id,
			isLead: true
		});
	}

	return linkedCases;
}
