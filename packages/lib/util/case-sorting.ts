/**
 * Utility functions for sorting case-related data.
 */

/**
 * Compares two references alphanumerically.
 * Uses numeric collation so that 'CASE/2' comes before 'CASE/10'.
 */
function compareReferences(a?: string | null, b?: string | null): number {
	return (a ?? '').localeCompare(b ?? '', undefined, { numeric: true });
}

interface LinkedCaseSortable {
	id: string;
	reference?: string | null;
}

/**
 * Sorts linked cases with lead cases first, then alphanumerically by reference.
 *
 * Uses numeric collation so that 'CASE/2' comes before 'CASE/10'.
 */
export function sortLinkedCases<T extends LinkedCaseSortable>(cases: T[], leadCaseId?: string | null): T[] {
	return [...cases].sort((a, b) => {
		// Lead case first
		if (a.id === leadCaseId && b.id !== leadCaseId) return -1;
		if (a.id !== leadCaseId && b.id === leadCaseId) return 1;

		return compareReferences(a.reference, b.reference);
	});
}

interface RelatedCaseSortable {
	reference?: string | null;
}

/**
 * Sorts related cases alphanumerically by reference.
 *
 * Uses numeric collation so that 'CASE/2' comes before 'CASE/10'.
 */
export function sortRelatedCases<T extends RelatedCaseSortable>(cases: T[]): T[] {
	return [...cases].sort((a, b) => compareReferences(a.reference, b.reference));
}
