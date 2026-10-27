import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { formatAddress } from '@pins/peas-row-commons-lib/util/audit-formatters.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import type { AuditEntry } from '../types.ts';

export type CaseToAddressWithAddress = Prisma.CaseToAddressGetPayload<{ include: { Address: true } }>;

/**
 * Compares old and new site addresses and returns audit entries for
 * additions, deletions, and address changes.
 *
 * Site addresses are stored as `CaseToAddress` join rows, each with a
 * stable GUID (`id`) assigned by the frontend and used for upserts in
 * `handleSiteAddresses`. We use this ID to match old and new entries,
 * which means:
 *
 *   - IDs in the new list but not the old → added
 *   - IDs in the old list but not the new → deleted
 *   - IDs in both, with a different formatted address → updated
 */
export function resolveSiteAddressAudits(
	caseId: string,
	userId: string | undefined,
	oldSiteAddresses: CaseToAddressWithAddress[],
	newSiteAddresses: { id: string; siteAddress?: Record<string, unknown> | null }[]
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	const oldById = new Map(oldSiteAddresses.map((sa) => [sa.id, sa]));
	const newById = new Map(newSiteAddresses.filter((sa) => sa.id && sa.siteAddress).map((sa) => [sa.id as string, sa]));

	// Added — ID exists in new submission but not in existing data
	for (const [id, newSiteAddress] of newById) {
		if (!oldById.has(id)) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.SITE_ADDRESS_ADDED,
				userId,
				metadata: { newValue: formatAddress(newSiteAddress.siteAddress) }
			});
		}
	}

	// Deleted — ID exists in existing data but not in new submission
	for (const [id, oldSiteAddress] of oldById) {
		if (!newById.has(id)) {
			entries.push({
				caseId,
				action: AUDIT_ACTIONS.SITE_ADDRESS_DELETED,
				userId,
				metadata: { oldValue: formatAddress(oldSiteAddress.Address) }
			});
		}
	}

	// Updated — ID exists in both, compare formatted address strings
	for (const [id, newSiteAddress] of newById) {
		const oldSiteAddress = oldById.get(id);
		if (!oldSiteAddress) continue;

		const oldValue = formatAddress(oldSiteAddress.Address);
		const newValue = formatAddress(newSiteAddress.siteAddress);

		if (oldValue === newValue) continue;

		entries.push({
			caseId,
			action: AUDIT_ACTIONS.SITE_ADDRESS_UPDATED,
			userId,
			metadata: { oldValue, newValue }
		});
	}

	return entries;
}
