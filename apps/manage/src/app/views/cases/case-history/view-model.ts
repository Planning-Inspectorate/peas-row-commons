import { BULK_FILE_ACTIONS } from '@pins/peas-row-commons-lib/constants/audit.ts';
import { formatDateTime } from '@pins/peas-row-commons-lib/util/dates.ts';
import { resolveTemplate, type AuditAction } from '../../../audit/actions.ts';
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
 * Replaces any case IDs in the metadata with their corresponding case references
 * using the provided caseReferenceMap. This is used to make the audit details
 * more user-friendly by showing case references instead of internal IDs.
 */

function replaceCaseIdsWithReferences(
	metadata: Record<string, unknown> | null,
	caseReferenceMap: Map<string, string>
): Record<string, unknown> | undefined {
	if (!metadata) return undefined;

	const resolvedMetadata = { ...metadata };

	for (const key of ['reference', 'entityName', 'linkedCaseId', 'oldValue', 'newValue']) {
		const value = resolvedMetadata[key];

		if (typeof value === 'string') {
			const reference = caseReferenceMap.get(value);

			if (reference) {
				resolvedMetadata[key] = reference;
			}
		}
	}

	return resolvedMetadata;
}

/**
 * Transforms raw audit events into rows ready for the case history table.
 */
export function createCaseHistoryViewModel(
	events: Array<AuditEvent & { userName: string }>,
	caseReferenceMap: Map<string, string> = new Map()
): CaseHistoryRow[] {
	return events.map((event) => {
		const { date, time } = formatDateTime(new Date(event.createdAt));
		const resolvedMetadata = replaceCaseIdsWithReferences(event.metadata ?? null, caseReferenceMap);

		return {
			date,
			time,
			details: resolveTemplate(event.action as AuditAction, resolvedMetadata),
			user: event.userName,
			files:
				BULK_FILE_ACTIONS.has(event.action) && Array.isArray(event.metadata?.files)
					? (event.metadata.files as string[])
					: undefined
		};
	});
}
