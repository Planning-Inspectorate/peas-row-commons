import type { AuditEntry } from '../types.ts';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { type AuditAction } from '../actions.ts';
import { OBJECTOR_STATUSES, CONTACT_TYPES } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { formatAddress } from '@pins/peas-row-commons-lib/util/audit-formatters.ts';

export type ContactWithAddress = Prisma.ContactGetPayload<{ include: { Address: true } }>;

/**
 * Builds a display name from a contact's name fields.
 * Prefers firstName + lastName, falls back to orgName, then '-'.
 */
function getContactDisplayName(
	firstName: string | null | undefined,
	lastName: string | null | undefined,
	orgName: string | null | undefined
): string {
	const parts = [firstName, lastName].filter(Boolean);
	if (parts.length > 0) return parts.join(' ');
	if (orgName) return orgName;
	return '-';
}

/**
 * Compares old and new contact lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Contacts are stored as `Contact` records, each with a stable GUID (`id`)
 * assigned by the frontend and used for upserts in `handleContacts`. We use
 * this ID to match old and new entries, which means:
 *
 *   - IDs in the new list but not the old → added
 *   - IDs in the old list but not the new → deleted
 *   - IDs in both → compare each sub-field for changes → updated
 *
 * Sub-fields compared (matching the scenarios doc):
 *   - name (firstName + lastName combined, falling back to orgName)
 *   - address (formatted as comma-separated string)
 *   - email
 *   - phone number
 *   - objector status (objectors only — resolved from OBJECTOR_STATUSES)
 *   - contact type (contacts only — resolved from CONTACT_TYPES)
 *
 */
export function resolveContactAudits(
	caseId: string,
	userId: string | undefined,
	oldContacts: ContactWithAddress[],
	newContacts: Record<string, unknown>[],
	prefix: string,
	actions: {
		added: AuditAction;
		updated: AuditAction;
		deleted: AuditAction;
	}
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	const oldById = new Map(oldContacts.map((c) => [c.id, c]));
	const newById = new Map(newContacts.map((c) => [c.id as string, c]));

	// Added — ID exists in new submission but not in existing data
	for (const [id, newContact] of newById) {
		if (!oldById.has(id)) {
			const name = getContactDisplayName(
				newContact[`${prefix}FirstName`] as string,
				newContact[`${prefix}LastName`] as string,
				newContact[`${prefix}OrgName`] as string
			);

			entries.push({
				caseId,
				action: actions.added,
				userId,
				metadata: { name }
			});
		}
	}

	// Deleted — ID exists in existing data but not in new submission
	for (const [id, oldContact] of oldById) {
		if (!newById.has(id)) {
			const name = getContactDisplayName(oldContact.firstName, oldContact.lastName, oldContact.orgName);

			entries.push({
				caseId,
				action: actions.deleted,
				userId,
				metadata: { name }
			});
		}
	}

	// Updated — ID exists in both, compare each auditable sub-field
	for (const [id, newContact] of newById) {
		const oldContact = oldById.get(id);
		if (!oldContact) continue;

		const entityName = getContactDisplayName(oldContact.firstName, oldContact.lastName, oldContact.orgName);

		// Name change (first + last combined)
		const oldName = getContactDisplayName(oldContact.firstName, oldContact.lastName, oldContact.orgName);
		const newName = getContactDisplayName(
			newContact[`${prefix}FirstName`] as string,
			newContact[`${prefix}LastName`] as string,
			newContact[`${prefix}OrgName`] as string
		);

		if (oldName !== newName) {
			entries.push({
				caseId,
				action: actions.updated,
				userId,
				metadata: {
					entityName,
					fieldName: 'name',
					oldValue: oldName,
					newValue: newName
				}
			});
		}

		// Address change
		const oldAddress = formatAddress(oldContact.Address as Record<string, unknown> | null);
		const newAddress = formatAddress(newContact[`${prefix}Address`] as Record<string, unknown> | null);

		if (oldAddress !== newAddress) {
			entries.push({
				caseId,
				action: actions.updated,
				userId,
				metadata: {
					entityName,
					fieldName: 'address',
					oldValue: oldAddress,
					newValue: newAddress
				}
			});
		}

		// Email change
		const oldEmail = oldContact.email || '-';
		const newEmail = (newContact[`${prefix}Email`] as string) || '-';

		if (oldEmail !== newEmail) {
			entries.push({
				caseId,
				action: actions.updated,
				userId,
				metadata: {
					entityName,
					fieldName: 'email',
					oldValue: oldEmail,
					newValue: newEmail
				}
			});
		}

		// Phone number change
		const oldPhone = oldContact.telephoneNumber || '-';
		const newPhone = (newContact[`${prefix}TelephoneNumber`] as string) || '-';

		if (oldPhone !== newPhone) {
			entries.push({
				caseId,
				action: actions.updated,
				userId,
				metadata: {
					entityName,
					fieldName: 'phone number',
					oldValue: oldPhone,
					newValue: newPhone
				}
			});
		}

		// Objector status change — only produces an entry for objectors,
		// since applicants and contacts will have null on both sides.
		// Resolves the raw status ID to a human-readable display name
		// from OBJECTOR_STATUSES (e.g. 'Admissable', 'Upheld').
		if (oldContact.objectorStatusId || newContact[`${prefix}StatusId`]) {
			const oldStatusId = oldContact.objectorStatusId || null;
			const newStatusId = (newContact[`${prefix}StatusId`] as string) || null;

			if (oldStatusId !== newStatusId) {
				const oldStatus = OBJECTOR_STATUSES.find((s) => s.id === oldStatusId)?.displayName ?? '-';
				const newStatus = OBJECTOR_STATUSES.find((s) => s.id === newStatusId)?.displayName ?? '-';

				entries.push({
					caseId,
					action: actions.updated,
					userId,
					metadata: {
						entityName,
						fieldName: 'status',
						oldValue: oldStatus,
						newValue: newStatus
					}
				});
			}
		}

		// Contact type change — only produces an entry for contacts,
		// since applicants and objectors have fixed contact types.
		// Resolves the raw type ID to a human-readable display name
		// from CONTACT_TYPES (e.g. 'acquiring authority', 'interested owner').
		if (oldContact.contactTypeId || newContact['contactTypeId']) {
			const oldTypeId = oldContact.contactTypeId || null;
			const newTypeId = (newContact['contactTypeId'] as string) || null;

			if (oldTypeId !== newTypeId) {
				const oldType = CONTACT_TYPES.find((t) => t.id === oldTypeId)?.displayName ?? '-';
				const newType = CONTACT_TYPES.find((t) => t.id === newTypeId)?.displayName ?? '-';

				entries.push({
					caseId,
					action: actions.updated,
					userId,
					metadata: {
						entityName,
						fieldName: 'contact type',
						oldValue: oldType,
						newValue: newType
					}
				});
			}
		}
	}

	return entries;
}
