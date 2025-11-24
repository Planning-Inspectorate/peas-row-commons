/**
 * Converts a query string into an array of strings.
 * The query can be a comma-separated or whitespace-separated string.
 */
export function splitStringQueries(query: string | undefined) {
	if (!query) return undefined;
	return query
		.split(/[\s,]+/) // Split by whitespace or commas
		.map((s) => s.trim())
		.filter(Boolean);
}

interface Constraint {
	[key: string]: any;
}

interface SearchOption {
	parent?: string;
	fields: string[];
	searchType?: 'contains' | 'startsWith' | 'endsWith' | string;
	constraints?: Constraint[];
}

/**
 * Creates a where clause for Prisma queries based on the provided search queries.
 */
export function createWhereClause(queries: string[] | undefined, options: SearchOption[]) {
	if (!queries || queries.length === 0) {
		return undefined;
	}
	if (!options || options.length === 0 || !options.some((option) => option.fields && option.fields.length > 0)) {
		throw new Error('Missing options for creating the query.');
	}
	return {
		AND: queries.map((query) => ({
			OR: options.flatMap((option) => {
				const { parent, fields, searchType = 'contains', constraints = [] } = option;
				return fields.map((field) => {
					const condition = { [searchType]: query };
					const fieldCondition = parent ? { [parent]: { [field]: condition } } : { [field]: condition };
					// Apply group-specific exclusions
					if (constraints.length) {
						return { AND: [fieldCondition, ...constraints] };
					}
					return fieldCondition;
				});
			})
		}))
	};
}
