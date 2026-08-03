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
	reference?: string | null;
	isLead: boolean;
}

/**
 * Sorts linked cases with lead cases first, then alphanumerically by reference.
 *
 * Uses numeric collation so that 'CASE/2' comes before 'CASE/10'.
 */
export function sortLinkedCases<T extends LinkedCaseSortable>(cases: T[]): T[] {
	return [...cases].sort((a, b) => {
		// Lead cases first
		if (a.isLead !== b.isLead) {
			return a.isLead ? -1 : 1;
		}

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
