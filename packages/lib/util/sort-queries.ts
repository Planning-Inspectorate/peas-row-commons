import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Request } from 'express';

type SortOrder = Prisma.SortOrder;

type ScalarSortKeys<T> = {
	[K in keyof T]-?: SortOrder extends NonNullable<T[K]> ? K : never;
}[keyof T] &
	string;

export interface SortDefaults<T> {
	/** The default field to sort by if none is specified */
	sortBy: ScalarSortKeys<T>;
	/** The default order to sort by if none is specified */
	sortOrder: SortOrder;
	/** The list of fields that are allowed to be sorted by */
	allowedFields: readonly ScalarSortKeys<T>[];
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
): { sortField: ScalarSortKeys<T>; sortOrder: SortOrder } {
	const requestedField = req.query?.sortBy;
	const requestedOrder = req.query?.order;

	const sortField =
		typeof requestedField === 'string' && isAllowedField(requestedField, defaults.allowedFields)
			? (requestedField as ScalarSortKeys<T>)
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
function isAllowedField<T>(field: string, allowed: readonly ScalarSortKeys<T>[]): field is ScalarSortKeys<T> {
	return (allowed as readonly string[]).includes(field);
}
