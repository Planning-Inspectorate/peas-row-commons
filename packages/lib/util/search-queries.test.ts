import { describe, it } from 'node:test';
import assert from 'node:assert';
import { splitStringQueries, createWhereClause } from './search-queries.ts';

describe('getStringQueries', () => {
	it('should split comma-separated values', () => {
		assert.deepStrictEqual(splitStringQueries('a,b,c'), ['a', 'b', 'c']);
	});
	it('should split whitespace-separated values', () => {
		assert.deepStrictEqual(splitStringQueries('a b c'), ['a', 'b', 'c']);
	});
	it('should split mixed comma and whitespace', () => {
		assert.deepStrictEqual(splitStringQueries('a, b c ,d'), ['a', 'b', 'c', 'd']);
	});
	it('should trim and filter empty values', () => {
		assert.deepStrictEqual(splitStringQueries(' a  , , b ,,c ,  '), ['a', 'b', 'c']);
	});
	it('should return undefined for undefined input', () => {
		assert.strictEqual(splitStringQueries(undefined), undefined);
	});
	it('should return undefined for empty string', () => {
		assert.deepStrictEqual(splitStringQueries(''), undefined);
	});
});

describe('createWhereClause', () => {
	describe('single options', () => {
		const options = [{ fields: ['name'], searchType: 'contains' }];

		it('should return undefined for empty queries', () => {
			assert.strictEqual(createWhereClause(undefined, options), undefined);
			assert.strictEqual(createWhereClause([], options), undefined);
		});

		it('should create where clause for single query', () => {
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, { AND: [{ OR: [{ name: { contains: 'foo' } }] }] });
		});

		it('should create where clause for multiple queries', () => {
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ name: { contains: 'foo' } }] }, { OR: [{ name: { contains: 'bar' } }] }]
			});
		});

		it('should default to contains when missing searchType', () => {
			const opts = [{ fields: ['name'] }];
			const result = createWhereClause(['foo', 'bar'], opts);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ name: { contains: 'foo' } }] }, { OR: [{ name: { contains: 'bar' } }] }]
			});
		});
		it('should throw missing fields', () => {
			const opts = [{ searchType: 'contains', fields: [] }];
			assert.throws(() => createWhereClause(['foo'], opts), {
				message: 'Missing options for creating the query.'
			});
		});
		it('should use the searchType if provided', () => {
			const opts = [{ fields: ['name'], searchType: 'startsWith' }];
			const result = createWhereClause(['foo', 'bar'], opts);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ name: { startsWith: 'foo' } }] }, { OR: [{ name: { startsWith: 'bar' } }] }]
			});
		});
	});

	describe('multi-field queries single option', () => {
		const options = [{ fields: ['name', 'age'], searchType: 'contains' }];

		it('should create where clause for single query across multiple fields', () => {
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }] }]
			});
		});

		it('should create where clause for multiple queries across multiple fields', () => {
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, {
				AND: [
					{ OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }] },
					{ OR: [{ name: { contains: 'bar' } }, { age: { contains: 'bar' } }] }
				]
			});
		});
	});

	describe('multiple options', () => {
		const options = [
			{ fields: ['name', 'age'], searchType: 'contains' },
			{ fields: ['desc'], searchType: 'startsWith' }
		];

		it('should return undefined for empty queries', () => {
			assert.strictEqual(createWhereClause(undefined, options), undefined);
			assert.strictEqual(createWhereClause([], options), undefined);
		});

		it('should create where clause for single query across all options', () => {
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }, { desc: { startsWith: 'foo' } }] }]
			});
		});

		it('should create where clause for multiple queries across all options', () => {
			const result = createWhereClause(['foo', 'bar'], options);
			assert.deepStrictEqual(result, {
				AND: [
					{ OR: [{ name: { contains: 'foo' } }, { age: { contains: 'foo' } }, { desc: { startsWith: 'foo' } }] },
					{ OR: [{ name: { contains: 'bar' } }, { age: { contains: 'bar' } }, { desc: { startsWith: 'bar' } }] }
				]
			});
		});
	});

	describe('parent field handling', () => {
		it('should create where clause for parent with multiple fields', () => {
			const options = [{ parent: 'Contact', fields: ['firstName', 'lastName'], searchType: 'contains' }];
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ Contact: { firstName: { contains: 'foo' } } }, { Contact: { lastName: { contains: 'foo' } } }] }]
			});
		});

		it('should mix parent and non-parent options', () => {
			const options = [
				{ parent: 'Contact', fields: ['firstName', 'lastName'], searchType: 'contains' },
				{ fields: ['city'], searchType: 'startsWith' }
			];
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				AND: [
					{
						OR: [
							{ Contact: { firstName: { contains: 'foo' } } },
							{ Contact: { lastName: { contains: 'foo' } } },
							{ city: { startsWith: 'foo' } }
						]
					}
				]
			});
		});

		it('should handle multiple parents', () => {
			const options = [
				{ parent: 'User', fields: ['first', 'last'], searchType: 'contains' },
				{ parent: 'Profile', fields: ['email'], searchType: 'startsWith' }
			];
			const result = createWhereClause(['baz', 'buzz'], options);
			assert.deepStrictEqual(result, {
				AND: [
					{
						OR: [
							{ User: { first: { contains: 'baz' } } },
							{ User: { last: { contains: 'baz' } } },
							{ Profile: { email: { startsWith: 'baz' } } }
						]
					},
					{
						OR: [
							{ User: { first: { contains: 'buzz' } } },
							{ User: { last: { contains: 'buzz' } } },
							{ Profile: { email: { startsWith: 'buzz' } } }
						]
					}
				]
			});
		});
	});

	describe('constraints', () => {
		it('should include constraints in each field condition (single field)', () => {
			const options = [{ fields: ['comment'], constraints: [{ commentRedacted: { equals: null } }] }];
			const result = createWhereClause(['foo'], options);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ AND: [{ comment: { contains: 'foo' } }, { commentRedacted: { equals: null } }] }] }]
			});
		});

		it('should include constraints with parent', () => {
			const options = [{ parent: 'Rep', fields: ['text'], constraints: [{ status: { equals: 'PUBLISHED' } }] }];
			const result = createWhereClause(['bar'], options);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ AND: [{ Rep: { text: { contains: 'bar' } } }, { status: { equals: 'PUBLISHED' } }] }] }]
			});
		});
	});

	describe('edge cases', () => {
		it('should throw with empty options array', () => {
			assert.throws(() => createWhereClause(['foo'], []), { message: 'Missing options for creating the query.' });
		});
		it('should throw when options missing fields', () => {
			assert.throws(() => createWhereClause(['foo'], [{ searchType: 'contains', fields: [] }]), {
				message: 'Missing options for creating the query.'
			});
		});
		it('should not throw when options missing searchType', () => {
			assert.doesNotThrow(() => createWhereClause(['foo'], [{ fields: ['name'] }]));
		});
		it('should allow non-string query values (e.g. numbers) - passed through', () => {
			const options = [{ fields: ['id'], searchType: 'equals' }];
			const result = createWhereClause([123, 456], options);
			assert.deepStrictEqual(result, {
				AND: [{ OR: [{ id: { equals: 123 } }] }, { OR: [{ id: { equals: 456 } }] }]
			});
		});
		it('should keep empty string queries if provided explicitly', () => {
			const options = [{ fields: ['name'], searchType: 'contains' }];
			const result = createWhereClause([''], options);
			assert.deepStrictEqual(result, { AND: [{ OR: [{ name: { contains: '' } }] }] });
		});
	});
});
