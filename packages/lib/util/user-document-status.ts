import type { DefaultStatusParams } from './types.ts';

/**
 * User-Document statuses employ a "db as override"
 * strategy, where no row indicate the statuses
 * are the "defaults" for that document.
 *
 * Most of the time this is the expected:
 * 1) Unread
 * 2) Unflagged
 *
 * However, specifically for migrated cases from Horizon
 * that are "Closed" - those should have:
 * 1) Read
 * 2) Unflagged
 */
export function determineDefaultStatuses({ legacyCaseId, statusId, closedStatuses }: DefaultStatusParams) {
	const isMigratedFromHorizon = legacyCaseId && legacyCaseId.trim().length > 0;

	const isClosed = statusId && closedStatuses.includes(statusId);

	const isHorizonAndClosed = isMigratedFromHorizon && isClosed;

	return {
		defaultIsRead: !!isHorizonAndClosed,
		defaultIsFlagged: false
	};
}
