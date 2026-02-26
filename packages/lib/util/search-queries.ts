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
	isList?: boolean;
	relationConstraints?: Constraint[];
}

/**
 * Creates a where clause for Prisma queries based on the provided search queries.
 *
 * Can be for a simple column (e.g. reference on Case), or a join (parent provided),
 * and then if parent is provided can either be a simple 1-1 join (e.g. Case -> Status) or 1-many (e.g. Case -> Contacts)
 */
export function createWhereClause(queries: string[] | number[] | undefined, options: SearchOption[]) {
	if (!queries || queries.length === 0) {
		return undefined;
	}
	if (!options || options.length === 0 || !options.some((option) => option.fields && option.fields.length > 0)) {
		throw new Error('Missing options for creating the query.');
	}
	return {
		AND: queries.map((query) => ({
			OR: options.flatMap((option) => {
				const {
					parent,
					fields,
					searchType = 'contains',
					constraints = [],
					relationConstraints = [],
					// Is a 1-many join
					isList
				} = option;

				return fields.map((field) => {
					const condition = { [searchType]: query };
					let fieldCondition: Record<string, unknown> = { [field]: condition };

					if (parent) {
						const innerCondition =
							relationConstraints.length > 0 ? { AND: [fieldCondition, ...relationConstraints] } : fieldCondition;

						if (isList) {
							fieldCondition = { [parent]: { some: innerCondition } };
						} else {
							fieldCondition = { [parent]: innerCondition };
						}
					}

					if (constraints.length) {
						return { AND: [fieldCondition, ...constraints] };
					}
					return fieldCondition;
				});
			})
		}))
	};
}
