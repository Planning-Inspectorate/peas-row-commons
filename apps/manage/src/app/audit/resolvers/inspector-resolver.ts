import type { AuditEntry } from '../types.ts';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import { formatDate } from '@pins/peas-row-commons-lib/util/audit-formatters.ts';

export type InspectorWithUser = Prisma.InspectorGetPayload<{ include: { Inspector: true } }>;

/**
 * Compares old and new inspector lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Inspectors are stored in a join table (`CaseInspector`) linking a case
 * to a `User` record via the `Inspector` relation. The form submits each
 * inspector as `{ inspectorId, inspectorAllocatedDate }` where `inspectorId`
 * is the Entra `idpUserId`.
 *
 * We diff by Entra user ID (`idpUserId`) as the stable identity key. This
 * correctly handles deletions from the middle of the list
 */
export function resolveInspectorAudits(
	caseId: string,
	userId: string | undefined,
	oldInspectors: InspectorWithUser[],
	newInspectors: { inspectorId: string; inspectorAllocatedDate: string }[],
	userDisplayNameMap: Map<string, string>
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	// Key by the Entra user ID — this is the stable identity for an inspector
	const oldByUserId = new Map(oldInspectors.map((ins) => [ins.Inspector?.idpUserId, ins]));
	const newByUserId = new Map(newInspectors.map((ins) => [ins.inspectorId, ins]));

	// Added — in new but not in old
	for (const [entraId] of newByUserId) {
		if (!oldByUserId.has(entraId)) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.INSPECTOR_ADDED,
				userId,
				metadata: { name: resolveInspectorName(entraId, userDisplayNameMap) }
			});
		}
	}

	// Deleted — in old but not in new
	for (const [entraId] of oldByUserId) {
		if (entraId && !newByUserId.has(entraId)) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.INSPECTOR_DELETED,
				userId,
				metadata: { name: resolveInspectorName(entraId, userDisplayNameMap) }
			});
		}
	}

	// Updated — exists in both, check sub-fields
	for (const [entraId, newItem] of newByUserId) {
		const oldItem = oldByUserId.get(entraId);
		if (!oldItem) continue;

		const inspectorName = resolveInspectorName(entraId, userDisplayNameMap);

		// Date appointed changed
		const oldDate = formatDate(oldItem.inspectorAllocatedDate);
		const newDate = formatDate(newItem.inspectorAllocatedDate);

		if (oldDate !== newDate) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.INSPECTOR_UPDATED,
				userId,
				metadata: {
					entityName: inspectorName,
					fieldName: 'date appointed',
					oldValue: oldDate,
					newValue: newDate
				}
			});
		}
	}

	return entries;
}

/**
 * Resolves an Entra user ID to a display name.
 * Falls back to the raw ID if the user isn't in the map.
 */
function resolveInspectorName(idpUserId: string | null | undefined, userDisplayNameMap: Map<string, string>): string {
	if (!idpUserId) {
		return '-';
	}

	return userDisplayNameMap.get(idpUserId) ?? idpUserId;
}
