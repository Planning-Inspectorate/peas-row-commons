/**
 * Utility functions for sorting case-related data.
 */

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

		const aRef = a.reference ?? '';
		const bRef = b.reference ?? '';

		// Then alphanumeric by reference
		return aRef.localeCompare(bRef, undefined, { numeric: true });
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
	return [...cases].sort((a, b) => {
		const aRef = a.reference ?? '';
		const bRef = b.reference ?? '';

		// Then alphanumeric by reference
		return aRef.localeCompare(bRef, undefined, { numeric: true });
	});
}
