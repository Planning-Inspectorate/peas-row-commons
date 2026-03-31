import { formatDateTime } from '@pins/peas-row-commons-lib/util/dates.ts';
import { resolveTemplate, AUDIT_ACTIONS, type AuditAction } from '../../../audit/actions.ts';
import type { AuditEvent } from '../../../audit/types.ts';

export interface CaseHistoryRow {
	/** Formatted date line: "11 February 2026" */
	date: string;
	/** Formatted time line: "2:31pm" */
	time: string;
	/**
	 * Human-readable detail from the audit template.
	 * May contain HTML for bulk file entries (show/hide toggle).
	 * Rendered via `html` not `text` in the Nunjucks table.
	 */
	details: string;
	/** Display name of the user who performed the action */
	user: string;
	/** File names for bulk file actions — rendered as show/hide in the template */
	files?: string[];
}

/**
 * Actions that support a collapsible file list in the details column.
 * When these actions have a `files` array in metadata, the details
 * will include a GOV.UK details component for show/hide.
 */
const BULK_FILE_ACTIONS = new Set<string>([
	AUDIT_ACTIONS.FILES_UPLOADED,
	AUDIT_ACTIONS.FILES_DOWNLOADED,
	AUDIT_ACTIONS.FILES_DELETED
]);

/**
 * Transforms raw audit events into rows ready for the case history table.
 */
export function createCaseHistoryViewModel(events: Array<AuditEvent & { userName: string }>): CaseHistoryRow[] {
	return events.map((event) => {
		const { date, time } = formatDateTime(new Date(event.createdAt));

		return {
			date,
			time,
			details: resolveTemplate(event.action as AuditAction, event.metadata ?? undefined),
			user: event.userName,
			files:
				BULK_FILE_ACTIONS.has(event.action) && Array.isArray(event.metadata?.files)
					? (event.metadata.files as string[])
					: undefined
		};
	});
}
