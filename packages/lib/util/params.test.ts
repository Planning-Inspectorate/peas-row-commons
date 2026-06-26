import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getStringParam, getStringParams, getOptionalStringParam, getOptionalStringParams } from './params.ts';

describe('Params Utils', () => {
	describe('getStringParam', () => {
		it('should return the string value when key exists and is a string', () => {
			const obj = { name: 'John', age: '30' };
			assert.strictEqual(getStringParam(obj, 'name'), 'John');
			assert.strictEqual(getStringParam(obj, 'age'), '30');
		});

		it('should throw an error when key is missing', () => {
			const obj = { name: 'John' };
			assert.throws(() => getStringParam(obj, 'missing'), { message: 'missing must be a single string value' });
		});

		it('should throw an error when value is not a string', () => {
			const obj = { count: 42, active: true, items: ['a', 'b'] };

			assert.throws(() => getStringParam(obj, 'count'), { message: 'count must be a single string value' });

			assert.throws(() => getStringParam(obj, 'active'), { message: 'active must be a single string value' });

			assert.throws(() => getStringParam(obj, 'items'), { message: 'items must be a single string value' });
		});

		it('should throw an error when obj is undefined', () => {
			assert.throws(() => getStringParam(undefined, 'key'), { message: 'key must be a single string value' });
		});

		it('should throw an error when value is null', () => {
			const obj = { name: null };
			assert.throws(() => getStringParam(obj as Record<string, unknown>, 'name'), {
				message: 'name must be a single string value'
			});
		});

		it('should handle empty string as a valid value', () => {
			const obj = { empty: '' };
			assert.strictEqual(getStringParam(obj, 'empty'), '');
		});
	});

	describe('getStringParams', () => {
		it('should return an object with all requested string values', () => {
			const obj = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
			const result = getStringParams(obj, ['firstName', 'lastName']);

			assert.deepStrictEqual(result, {
				firstName: 'John',
				lastName: 'Doe'
			});
		});

		it('should throw an error if any key is missing', () => {
			const obj = { firstName: 'John' };
			assert.throws(() => getStringParams(obj, ['firstName', 'lastName']), {
				message: 'lastName must be a single string value'
			});
		});

		it('should throw an error if any value is not a string', () => {
			const obj = { name: 'John', age: 30 };
			assert.throws(() => getStringParams(obj, ['name', 'age']), { message: 'age must be a single string value' });
		});

		it('should return an empty object when keys array is empty', () => {
			const obj = { name: 'John' };
			const result = getStringParams(obj, []);
			assert.deepStrictEqual(result, {});
		});

		it('should handle undefined obj', () => {
			assert.throws(() => getStringParams(undefined, ['key']), { message: 'key must be a single string value' });
		});
	});

	describe('getOptionalStringParam', () => {
		it('should return the string value when key exists and is a string', () => {
			const obj = { name: 'John' };
			assert.strictEqual(getOptionalStringParam(obj, 'name'), 'John');
		});

		it('should return null when key is missing', () => {
			const obj = { name: 'John' };
			assert.strictEqual(getOptionalStringParam(obj, 'missing'), null);
		});

		it('should return null when value is undefined', () => {
			const obj = { name: undefined };
			assert.strictEqual(getOptionalStringParam(obj as Record<string, unknown>, 'name'), null);
		});

		it('should return null when value is null', () => {
			const obj = { name: null };
			assert.strictEqual(getOptionalStringParam(obj as Record<string, unknown>, 'name'), null);
		});

		it('should return null when obj is undefined', () => {
			assert.strictEqual(getOptionalStringParam(undefined, 'key'), null);
		});

		it('should throw an error when value exists but is not a string', () => {
			const obj = { count: 42, active: true };

			assert.throws(() => getOptionalStringParam(obj, 'count'), { message: 'count must be a single string value' });

			assert.throws(() => getOptionalStringParam(obj, 'active'), { message: 'active must be a single string value' });
		});

		it('should handle empty string as a valid value', () => {
			const obj = { empty: '' };
			assert.strictEqual(getOptionalStringParam(obj, 'empty'), '');
		});
	});

	describe('getOptionalStringParams', () => {
		it('should return an object with all requested values', () => {
			const obj = { firstName: 'John', lastName: 'Doe' };
			const result = getOptionalStringParams(obj, ['firstName', 'lastName', 'middleName']);

			assert.deepStrictEqual(result, {
				firstName: 'John',
				lastName: 'Doe',
				middleName: null
			});
		});

		it('should return null for missing keys', () => {
			const obj = { name: 'John' };
			const result = getOptionalStringParams(obj, ['name', 'email']);

			assert.deepStrictEqual(result, {
				name: 'John',
				email: null
			});
		});

		it('should throw an error if any value exists but is not a string', () => {
			const obj = { name: 'John', age: 30 };
			assert.throws(() => getOptionalStringParams(obj, ['name', 'age']), {
				message: 'age must be a single string value'
			});
		});

		it('should return an empty object when keys array is empty', () => {
			const obj = { name: 'John' };
			const result = getOptionalStringParams(obj, []);
			assert.deepStrictEqual(result, {});
		});

		it('should handle undefined obj by returning all nulls', () => {
			const result = getOptionalStringParams(undefined, ['key1', 'key2']);
			assert.deepStrictEqual(result, {
				key1: null,
				key2: null
			});
		});

		it('should handle null and undefined values in the object', () => {
			const obj = { a: 'value', b: null, c: undefined };
			const result = getOptionalStringParams(obj as Record<string, unknown>, ['a', 'b', 'c', 'd']);

			assert.deepStrictEqual(result, {
				a: 'value',
				b: null,
				c: null,
				d: null
			});
		});
	});
});
