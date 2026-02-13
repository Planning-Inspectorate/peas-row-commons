import { resolveTemplate, type AuditAction } from '../../../audit/actions.ts';
import type { AuditEvent } from '../../../audit/types.ts';

export interface CaseHistoryRow {
	/** Formatted date line: "11 February 2026" */
	date: string;
	/** Formatted time line: "2:31pm" */
	time: string;
	/** Human-readable detail from the audit template */
	details: string;
	/** Display name of the user who performed the action */
	user: string;
}

/**
 * Formats a Date into the two-line format specified in the ticket:
 *   Date: "11 February 2026"
 *   Time: "2:31pm"
 */
function formatDateTime(dateTime: Date): { date: string; time: string } {
	const date = dateTime.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	const time = dateTime
		.toLocaleTimeString('en-GB', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		})
		.toLowerCase();

	return { date, time };
}

/**
 * Transforms raw audit events into rows ready for the case history table.
 */
export function createCaseHistoryViewModel(events: Array<AuditEvent & { userName: string }>): CaseHistoryRow[] {
	return events.map((event) => {
		const { date, time } = formatDateTime(new Date(event.createdAt));

		return {
			date,
			time,
			details: resolveTemplate(event.action as AuditAction, event.metadata || undefined),
			user: event.userName
		};
	});
}
