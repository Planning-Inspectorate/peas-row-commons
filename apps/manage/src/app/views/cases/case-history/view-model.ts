import { BULK_FILE_ACTIONS } from '@pins/peas-row-commons-lib/constants/audit.ts';
import { formatDateTime } from '@pins/peas-row-commons-lib/util/dates.ts';
import { AUDIT_ACTIONS, resolveTemplate, type AuditAction } from '../../../audit/actions.ts';
import type { AuditEvent } from '../../../audit/types.ts';

export interface CaseHistoryAccordionSection {
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
	/** Accordion sections for richer audit detail, e.g. linked case before/after lists */
	accordionSections?: CaseHistoryAccordionSection[];
}

type LinkedCaseAuditMember = {
	caseId: string;
	isLead: boolean;
};

/**
 * Safely extracts and casts a linked-case array from metadata.
 */
function getLinkedCaseArray(value: unknown): LinkedCaseAuditMember[] {
	return Array.isArray(value) ? (value as LinkedCaseAuditMember[]) : [];
}

/**
 * Formats a linked-case member into a display string, resolving the case ID
 * to a case reference where possible.
 */
function formatLinkedCaseMember(member: LinkedCaseAuditMember, caseReferenceMap: Map<string, string>): string {
	const reference = caseReferenceMap.get(member.caseId) ?? member.caseId;
	return member.isLead ? `${reference} (lead)` : reference;
}

/**
 * Extracts and formats linked-case arrays from audit metadata into accordion-ready sections.
 */
function buildLinkedCaseHistoryAccordionSections(
	metadata: Record<string, unknown> | null | undefined,
	caseReferenceMap: Map<string, string>
): CaseHistoryAccordionSection[] | undefined {
	if (!metadata) return undefined;

	const oldLinkedCases = getLinkedCaseArray(metadata.oldLinkedCases);
	const newLinkedCases = getLinkedCaseArray(metadata.newLinkedCases);

	if (oldLinkedCases.length === 0 && newLinkedCases.length === 0) {
		return undefined;
	}

	const sections: CaseHistoryAccordionSection[] = [];

	if (oldLinkedCases.length > 0) {
		sections.push({
			label: 'Previous linked cases',
			values: oldLinkedCases.map((m) => formatLinkedCaseMember(m, caseReferenceMap))
		});
	}

	if (newLinkedCases.length > 0) {
		sections.push({
			label: 'New linked cases',
			values: newLinkedCases.map((m) => formatLinkedCaseMember(m, caseReferenceMap))
		});
	}

	return sections.length > 0 ? sections : undefined;
}

/**
 * Replaces case IDs in simple metadata fields with their corresponding case references.
 */
function replaceCaseIdsWithReferences(
	metadata: Record<string, unknown> | null | undefined,
	caseReferenceMap: Map<string, string>
): Record<string, unknown> | undefined {
	if (!metadata) return undefined;

	const resolved = { ...metadata };
	const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	// Replace any UUID-formatted string values with their case references
	for (const key in resolved) {
		const value = resolved[key];
		if (typeof value === 'string' && uuidPattern.test(value)) {
			const reference = caseReferenceMap.get(value);
			if (reference) {
				resolved[key] = reference;
			}
		}
	}

	return resolved;
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
		const metadata = event.metadata ?? null;

		return {
			date,
			time,
			details: resolveTemplate(event.action as AuditAction, replaceCaseIdsWithReferences(metadata, caseReferenceMap)),
			user: event.userName,
			files:
				BULK_FILE_ACTIONS.has(event.action) && Array.isArray(metadata?.files)
					? (metadata.files as string[])
					: undefined,
			accordionSections:
				event.action === AUDIT_ACTIONS.LINKED_CASE_UPDATED
					? buildLinkedCaseHistoryAccordionSections(metadata, caseReferenceMap)
					: undefined
		};
	});
}
