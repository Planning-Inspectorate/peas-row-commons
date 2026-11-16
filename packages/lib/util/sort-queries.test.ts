import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Request } from 'express';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { SortDefaults } from './sort-queries.ts';
import { getSortQueries } from './sort-queries.ts';

type TestOrderBy = {
	name?: Prisma.SortOrder;
	date?: Prisma.SortOrder;
	defaultField?: Prisma.SortOrder;
};

const defaults = {
	sortBy: 'defaultField',
	sortOrder: 'desc',
	allowedFields: ['name', 'date', 'defaultField']
} satisfies SortDefaults<TestOrderBy>;

describe('sort-queries', () => {
	describe('saved preferences', () => {
		it('uses saved sorting when query parameters are absent', () => {
			const req = { query: {} } as Request;

			assert.deepStrictEqual(getSortQueries<TestOrderBy>(req, defaults, { sortBy: 'name', sortOrder: 'asc' }), {
				sortField: 'name',
				sortOrder: 'asc'
			});
		});

		it('gives explicit query parameters precedence over saved sorting', () => {
			const req = { query: { sortBy: 'date', order: 'desc' } } as Request;

			assert.deepStrictEqual(getSortQueries<TestOrderBy>(req, defaults, { sortBy: 'name', sortOrder: 'asc' }), {
				sortField: 'date',
				sortOrder: 'desc'
			});
		});

		it('falls back to saved sorting for invalid query parameters', () => {
			const req = { query: { sortBy: 'unknown', order: 'invalid' } } as Request;

			assert.deepStrictEqual(getSortQueries<TestOrderBy>(req, defaults, { sortBy: 'name', sortOrder: 'asc' }), {
				sortField: 'name',
				sortOrder: 'asc'
			});
		});

		it('falls back to the default column when the saved column is no longer allowed', () => {
			const req = { query: {} } as Request;

			assert.deepStrictEqual(
				getSortQueries<TestOrderBy>(req, defaults, { sortBy: 'removed-column', sortOrder: 'asc' }),
				{ sortField: 'defaultField', sortOrder: 'asc' }
			);
		});
	});

	describe('happy path', () => {
		it('should return default sortBy and sortOrder if no query params are provided', () => {
			const req = {
				query: {}
			} as unknown as Request;

			const result = getSortQueries<TestOrderBy>(req, defaults);
			assert.deepStrictEqual(result, { sortField: 'defaultField', sortOrder: 'desc' });
		});

		it('should format sort-queries and return if valid', () => {
			const req = {
				query: {
					sortBy: 'name',
					order: 'asc'
				}
			} as unknown as Request;

			const result = getSortQueries<TestOrderBy>(req, defaults);
			assert.deepStrictEqual(result, { sortField: 'name', sortOrder: 'asc' });
		});
	});

	describe('invalid sort-queries', () => {
		it('should fall back to defaults sortBy if sortBy is invalid', () => {
			const req = {
				query: {
					sortBy: 'invalidField',
					order: 'asc'
				}
			} as unknown as Request;

			const result = getSortQueries<TestOrderBy>(req, defaults);
			assert.deepStrictEqual(result, { sortField: 'defaultField', sortOrder: 'asc' });
		});

		it('should fall back to defaults sortOrder if order is invalid', () => {
			const req = {
				query: {
					sortBy: 'name',
					order: 'invalidOrder'
				}
			} as unknown as Request;

			const result = getSortQueries<TestOrderBy>(req, defaults);
			assert.deepStrictEqual(result, { sortField: 'name', sortOrder: 'desc' });
		});
	});

	describe('edge-cases', () => {
		it('should fall back to default sortBy when only order is provided', () => {
			const req = {
				query: {
					order: 'asc'
				}
			} as unknown as Request;

			const result = getSortQueries<TestOrderBy>(req, defaults);
			assert.deepStrictEqual(result, { sortField: 'defaultField', sortOrder: 'asc' });
		});

		it('should fall back to default when sortBy is an array', () => {
			const req = {
				query: {
					sortBy: ['name', 'date'],
					order: 'asc'
				}
			} as unknown as Request;

			const result = getSortQueries<TestOrderBy>(req, defaults);
			assert.deepStrictEqual(result, { sortField: 'defaultField', sortOrder: 'asc' });
		});

		it('should handle missing req.query gracefully and return defaults', () => {
			const req = {
				query: undefined
			} as unknown as Request;

			const result = getSortQueries<TestOrderBy>(req, defaults);
			assert.deepStrictEqual(result, { sortField: 'defaultField', sortOrder: 'desc' });
		});

		it('should fallback to default for injection-like sortBy', () => {
			const req = {
				query: {
					sortBy: 'name; DROP TABLE users;',
					order: 'asc'
				}
			} as unknown as Request;

			const result = getSortQueries<TestOrderBy>(req, defaults);
			assert.deepStrictEqual(result, { sortField: 'defaultField', sortOrder: 'asc' });
		});

		it('should fallback to default for injection-like order', () => {
			const req = {
				query: {
					sortBy: 'name',
					order: 'asc; DROP TABLE users;'
				}
			} as unknown as Request;

			const result = getSortQueries<TestOrderBy>(req, defaults);
			assert.deepStrictEqual(result, { sortField: 'name', sortOrder: 'desc' });
		});
	});
});
