import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isDefined } from './type-predicate.ts';

describe('isDefined', () => {
	it('should return false for null', () => {
		assert.strictEqual(isDefined(null), false);
	});

	it('should return false for undefined', () => {
		assert.strictEqual(isDefined(undefined), false);
	});

	it('should return true for a string', () => {
		assert.strictEqual(isDefined('hello'), true);
	});

	it('should return true for an empty string', () => {
		assert.strictEqual(isDefined(''), true);
	});

	it('should return true for zero', () => {
		assert.strictEqual(isDefined(0), true);
	});

	it('should return true for false', () => {
		assert.strictEqual(isDefined(false), true);
	});

	it('should return true for an object', () => {
		assert.strictEqual(isDefined({}), true);
	});

	it('should work with array filter', () => {
		const items: (string | null | undefined)[] = ['a', null, 'b', undefined, 'c'];
		const filtered = items.filter(isDefined);
		assert.deepStrictEqual(filtered, ['a', 'b', 'c']);
	});
});
