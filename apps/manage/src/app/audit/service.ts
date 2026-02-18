import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';
import type { AuditEntry, AuditEvent, AuditQueryOptions } from './types.ts';
import type { CaseOfficer } from '../views/cases/view/types.ts';

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
				await db.caseHistory.create({
					data: {
						caseId: entry.caseId,
						action: entry.action,
						metadata: JSON.stringify(entry.metadata ?? {}),
						userId: entry.userId
					}
				});
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
		 * Retrieve audit events for a case, newest first.
		 */
		async getAllForCase(caseId: string, options?: AuditQueryOptions): Promise<AuditEvent[]> {
			const { skip = 0, take = 50 } = options ?? {};

			try {
				const events = await db.caseHistory.findMany({
					where: { caseId },
					orderBy: { createdAt: 'desc' },
					skip,
					take
				});

				// Parse the metadata JSON string into an object
				return events.map((event) => ({
					...event,
					metadata: event.metadata ? JSON.parse(event.metadata) : null
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
		 * Get the most recent audit event for a case.
		 * Used for "last modified" information.
		 */
		async getLatestForCase(caseId: string): Promise<AuditEvent | null> {
			try {
				const event = await db.caseHistory.findFirst({
					where: { caseId },
					orderBy: { createdAt: 'desc' }
				});

				if (!event) {
					return null;
				}

				return {
					...event,
					metadata: event?.metadata ? JSON.parse(event.metadata) : null
				};
			} catch (error) {
				logger.error(
					{
						error,
						caseId
					},
					'Failed to fetch latest audit event'
				);
				return null;
			}
		},

		/**
		 * Get last modified information for display in case summary.
		 * Returns formatted data ready for the UI.
		 */
		async getLastModifiedInfo(
			caseId: string,
			groupMembers: { caseOfficers: CaseOfficer[] }
		): Promise<{
			date: string | null;
			by: string | null;
		}> {
			try {
				const latest = await db.caseHistory.findFirst({
					where: { caseId },
					orderBy: { createdAt: 'desc' },
					select: {
						createdAt: true,
						userId: true
					}
				});

				if (!latest) {
					return { date: null, by: null };
				}

				const date = new Date(latest.createdAt).toLocaleDateString('en-GB', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				});

				const user = groupMembers.caseOfficers.find((member) => member.id === latest.userId);

				return {
					date,
					by: user?.displayName || 'Unknown'
				};
			} catch (error) {
				logger.error(
					{
						error,
						caseId
					},
					'Failed to fetch last modified info'
				);
				return { date: null, by: null };
			}
		}
	};
}

export type AuditService = ReturnType<typeof buildAuditService>;
