import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Request } from 'express';

type SortOrder = Prisma.SortOrder;

/**
 * Gets the keys of a Prisma `OrderByWithRelationInput` type that can be sorted
 * directly with `'asc' | 'desc'`. These are the model's scalar columns.
 *
 * How it works:
 * 1. `[K in keyof T]-?` loops over every key of T. The `-?` removes optionality,
 *    so `undefined` is never part of a field's type.
 * 2. `SortOrder extends NonNullable<T[K]> ? K : never` keeps a key only if a plain
 *    `SortOrder` can be assigned to that field.
 *    - Scalar fields (e.g. `name?: SortOrder | SortOrderInput`) are kept.
 *    - Relation fields (e.g. `Status?: CaseStatusOrderByWithRelationInput`) become `never`.
 * 3. `[keyof T]` turns the mapped object into a union of its values. `never` drops
 *    out of the union, so only the scalar keys remain.
 * 4. `& string` removes `number` and `symbol` keys, so the result can be used as a
 *    query-string value.
 *
 * @example
 * ScalarSortKey<Prisma.CaseOrderByWithRelationInput>
 * // => 'id' | 'reference' | 'name' | 'receivedDate' | 'statusId' | ...
 */
export type ScalarSortKey<T> = {
	[K in keyof T]-?: SortOrder extends NonNullable<T[K]> ? K : never;
}[keyof T] &
	string;

export interface SortDefaults<T> {
	/** The default field to sort by if none is specified */
	sortBy: ScalarSortKey<T>;
	/** The default order to sort by if none is specified */
	sortOrder: SortOrder;
	/** The list of fields that are allowed to be sorted by */
	allowedFields: readonly ScalarSortKey<T>[];
}

/**
 * Extracts and validates sorting parameters from the request query.
 * Reads sortBy and order from the request query and checks them against the provided defaults.
 * Returns an object suitable for use in a Prisma orderBy clause.
 * If the parameters are invalid or not provided, it falls back to the specified defaults.
 */
export function getSortQueries<T>(
	req: Request,
	defaults: SortDefaults<T>
): { sortField: ScalarSortKey<T>; sortOrder: SortOrder } {
	const requestedField = req.query?.sortBy;
	const requestedOrder = req.query?.order;

	const sortField =
		typeof requestedField === 'string' && isAllowedField(requestedField, defaults.allowedFields)
			? (requestedField as ScalarSortKey<T>)
			: defaults.sortBy;

	const sortOrder =
		typeof requestedOrder === 'string' && validateOrderBy(requestedOrder) ? requestedOrder : defaults.sortOrder;

	return { sortField, sortOrder };
}

function validateOrderBy(orderBy: string | undefined): orderBy is SortOrder {
	return orderBy === Prisma.SortOrder.asc || orderBy === Prisma.SortOrder.desc;
}

/**
 * Checks if the provided field is in the list of allowed fields.
 * This is a type guard that narrows the type of the field to the allowed keys of T.
 */
function isAllowedField<T>(field: string, allowed: readonly ScalarSortKey<T>[]): field is ScalarSortKey<T> {
	return (allowed as readonly string[]).includes(field);
}
