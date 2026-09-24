import { BULK_FILE_ACTIONS } from '@pins/peas-row-commons-lib/constants/audit.ts';
import { sortLinkedCases } from '@pins/peas-row-commons-lib/util/case-sorting.ts';
import { formatDateTime } from '@pins/peas-row-commons-lib/util/dates.ts';
import { resolveTemplate, type AuditAction } from '../../../audit/actions.ts';
import type { AuditEvent } from '../../../audit/types.ts';

export interface CaseHistoryDetailSection {
	label: string;
	values: string[];
}

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
	/** Sections of additional details (long text) included in metadata */
	detailSections?: CaseHistoryDetailSection[];
}

type LinkedCaseAuditMember = {
	reference: string;
	isLead: boolean;
};

function getLinkedCaseArray(value: unknown): LinkedCaseAuditMember[] {
	return Array.isArray(value) ? (value as LinkedCaseAuditMember[]) : [];
}

function formatLinkedCaseMember(member: LinkedCaseAuditMember): string {
	return member.isLead ? `${member.reference} (lead)` : member.reference;
}

function buildDetailSections(
	metadata: Record<string, unknown> | null | undefined
): CaseHistoryDetailSection[] | undefined {
	if (!metadata) return undefined;

	const oldLinkedCases = getLinkedCaseArray(metadata.oldLinkedCases);
	const newLinkedCases = getLinkedCaseArray(metadata.newLinkedCases);

	if (oldLinkedCases.length === 0 && newLinkedCases.length === 0) {
		return undefined;
	}

	const sections: CaseHistoryDetailSection[] = [];

	if (oldLinkedCases.length > 0) {
		sections.push({
			label: 'Previous linked cases',
			values: sortLinkedCases(oldLinkedCases).map((member) => formatLinkedCaseMember(member))
		});
	}

	if (newLinkedCases.length > 0) {
		sections.push({
			label: 'New linked cases',
			values: sortLinkedCases(newLinkedCases).map((member) => formatLinkedCaseMember(member))
		});
	}

	return sections;
}

/**
 * Transforms raw audit events into rows ready for the case history table.
 */
export function createCaseHistoryViewModel(events: Array<AuditEvent & { userName: string }>): CaseHistoryRow[] {
	return events.map((event) => {
		const { date, time } = formatDateTime(new Date(event.createdAt));
		const metadata = event.metadata ?? undefined;

		const detailSections =
			Array.isArray(metadata?.oldLinkedCases) || Array.isArray(metadata?.newLinkedCases)
				? buildDetailSections(metadata)
				: undefined;

		return {
			date,
			time,
			details: resolveTemplate(event.action as AuditAction, metadata),
			user: event.userName,
			files:
				BULK_FILE_ACTIONS.has(event.action) && Array.isArray(metadata?.files)
					? (metadata.files as string[])
					: undefined,
			detailSections
		};
	});
}
