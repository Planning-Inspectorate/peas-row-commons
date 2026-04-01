import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';
import { parseMetadata, type AuditEntry, type AuditEvent, type AuditQueryOptions } from './types.ts';
import { formatDateTime } from '@pins/peas-row-commons-lib/util/dates.ts';
import type { EntraGroupMembers } from '#util/entra-groups-types.ts';

/**
 * Builds the audit service used to record and retrieve case history events.
 *
 * Design notes:
 *   - `record()` is fire-and-forget: audit failures are logged but never
 *     thrown so they can't break the user's actual operation.
 */
export function buildAuditService(db: PrismaClient, logger: Logger) {
	return {
		/**
		 * Persist a single audit event.
		 *
		 * Safe to call without awaiting if the caller doesn't need
		 * confirmation, but awaiting is fine too
		 */
		async record(entry: AuditEntry): Promise<void> {
			try {
				await db.$transaction([
					db.caseHistory.create({
						data: {
							Case: {
								connect: { id: entry.caseId }
							},
							action: entry.action,
							metadata: JSON.stringify(entry.metadata ?? {}),
							User: {
								connectOrCreate: {
									where: { idpUserId: entry.userId },
									create: { idpUserId: entry.userId }
								}
							}
						}
					}),
					// Updated By, Updated Date are stored as their own columns on Case
					db.case.update({
						where: { id: entry.caseId },
						data: {
							updatedDate: new Date(),
							UpdatedBy: {
								connectOrCreate: {
									where: { idpUserId: entry.userId },
									create: { idpUserId: entry.userId }
								}
							}
						}
					})
				]);
			} catch (error) {
				logger.error(
					{
						error,
						action: entry.action,
						caseId: entry.caseId
					},
					'Failed to record audit event'
				);
			}
		},

		/**
		 * Persist multiple audit entries in a single transaction.
		 *
		 * This avoids deadlocks that occur when many concurrent transactions
		 * each try to update the same Case row (e.g. bulk file moves with
		 * up to 100 files, or case updates that produce many field-level
		 * audit entries).
		 *
		 * All caseHistory rows are created individually, then a single
		 * case.update sets updatedDate/UpdatedBy once at the end.
		 */
		async recordMany(entries: AuditEntry[]): Promise<void> {
			if (entries.length === 0) return;

			try {
				const caseId = entries[0].caseId;
				const userId = entries[0].userId;

				await db.$transaction(async ($tx) => {
					// Ensure the user exists once, then use the scalar FK for createMany
					const user = await $tx.user.upsert({
						where: { idpUserId: userId },
						create: { idpUserId: userId },
						update: {}
					});

					await $tx.caseHistory.createMany({
						data: entries.map((entry) => ({
							caseId: entry.caseId,
							action: entry.action,
							metadata: JSON.stringify(entry.metadata ?? {}),
							userId: user.id
						}))
					});

					await $tx.case.update({
						where: { id: caseId },
						data: {
							updatedDate: new Date(),
							updatedById: user.id
						}
					});
				});
			} catch (error) {
				logger.error(
					{
						error,
						caseId: entries[0].caseId,
						entryCount: entries.length
					},
					'Failed to record audit events'
				);
			}
		},

		/**
		 * Retrieve audit events for a case, newest first.
		 */
		async getAllForCase(caseId: string, options?: AuditQueryOptions): Promise<AuditEvent[]> {
			const { skip = 0, take = 50 } = options ?? {};

			try {
				const events = await db.caseHistory.findMany({
					where: { caseId },
					orderBy: { createdAt: 'desc' },
					include: { User: { select: { idpUserId: true } } },
					skip,
					take
				});

				// Parse the metadata JSON string into an object
				return events.map((event) => ({
					...event,
					metadata: parseMetadata(event.metadata)
				}));
			} catch (error) {
				logger.error(
					{
						error,
						caseId
					},
					'Failed to fetch audit events'
				);

				// Returns an empty array on failure so the history page can still
				// render (with an appropriate message) rather than 500-ing.
				return [];
			}
		},

		/**
		 * Count total audit events for a case.
		 */
		async countForCase(caseId: string): Promise<number> {
			try {
				return await db.caseHistory.count({
					where: { caseId }
				});
			} catch (error) {
				logger.error(
					{
						error,
						caseId
					},
					'Failed to count audit events'
				);

				return 0;
			}
		},

		/**
		 * Get last modified information for display in case summary.
		 * Returns formatted data ready for the UI.
		 */
		async getLastModifiedInfo(
			caseId: string,
			groupMembers: EntraGroupMembers
		): Promise<{
			updatedDate: { date: string; time: string } | null;
			by: string | null;
			closedDate: { date: string; time: string } | null;
		}> {
			try {
				const caseRow = await db.case.findUnique({
					where: { id: caseId },
					select: {
						updatedDate: true,
						closedDate: true,
						UpdatedBy: { select: { idpUserId: true } }
					}
				});

				if (!caseRow) {
					throw new Error(`No folder found for id: ${caseId}`);
				}

				const updatedDate = caseRow.updatedDate ? formatDateTime(caseRow.updatedDate) : null;

				const closedDate = caseRow.closedDate ? formatDateTime(caseRow.closedDate) : null;

				const user = groupMembers.allUsers.find((member) => member.id === caseRow.UpdatedBy?.idpUserId);

				// 1. Try and get a user from entra and show their name
				// 2. Otherwise just show the idpUserId in plain text
				// 3. Otherwise show Unknown
				const userName = user?.displayName || caseRow.UpdatedBy?.idpUserId || 'Unknown';

				return {
					updatedDate,
					closedDate,
					by: userName
				};
			} catch (error) {
				logger.error(
					{
						error,
						caseId
					},
					'Failed to fetch last modified info'
				);
				return { updatedDate: null, closedDate: null, by: null };
			}
		}
	};
}

export type AuditService = ReturnType<typeof buildAuditService>;
