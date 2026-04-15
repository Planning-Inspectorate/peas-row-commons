import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toFloat } from './numbers.ts';

describe('toFloat', () => {
	it('should convert a numeric string to a float', () => {
		assert.strictEqual(toFloat('10.5'), 10.5);
		assert.strictEqual(toFloat('100'), 100.0);
	});

	it('should return null if the string is empty', () => {
		assert.strictEqual(toFloat(''), null);
	});

	it('should handle strings with non-numeric characters (via parseFloat behavior)', () => {
		assert.strictEqual(toFloat('10.5abc'), 10.5);
	});

	it('should return NaN if the string starts with non-numeric characters', () => {
		assert.ok(Number.isNaN(toFloat('abc10.5')));
	});

	// Cast null and undefined to stop TS complaining about a bad param
	it('should return null if undefined or null are passed (if types allow)', () => {
		assert.strictEqual(toFloat(null as unknown as string), null);
		assert.strictEqual(toFloat(undefined as unknown as string), null);
	});
});
