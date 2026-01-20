import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stringToKebab, checkAnswerlength, checkRequiredAnswer, toCamelCase } from './strings.ts';

describe('String Utils', () => {
	describe('stringToKebab', () => {
		it('should return empty string if input is falsy', () => {
			assert.strictEqual(stringToKebab(''), '');
			assert.strictEqual(stringToKebab(null as any), '');
			assert.strictEqual(stringToKebab(undefined as any), '');
		});

		it('should convert CamelCase to kebab-case', () => {
			assert.strictEqual(stringToKebab('CamelCase'), 'camel-case');
		});

		it('should convert spaces to dashes', () => {
			assert.strictEqual(stringToKebab('This is a test'), 'this-is-a-test');
			assert.strictEqual(stringToKebab('Multiple   Spaces'), 'multiple-spaces');
		});

		it('should convert underscores to dashes', () => {
			assert.strictEqual(stringToKebab('snake_case_string'), 'snake-case-string');
		});

		it('should handle mixed inputs', () => {
			assert.strictEqual(stringToKebab('Mixed_Case String'), 'mixed-case-string');
		});

		it('should handle unique characters', () => {
			assert.strictEqual(stringToKebab('Weird / CHARS () (too)'), 'weird-chars-too');

			assert.strictEqual(stringToKebab('MORE%% Unique &$& /// CHARS'), 'more-unique-chars');
		});
	});

	describe('checkAnswerlength', () => {
		const errorMsg = 'Too long';
		const pageLink = '#input';

		it('should return undefined if string is within limit', () => {
			const result = checkAnswerlength('short string', errorMsg, pageLink, 20);
			assert.strictEqual(result, undefined);
		});

		it('should return error object if string exceeds limit', () => {
			const longString = 'a'.repeat(21);
			const result = checkAnswerlength(longString, errorMsg, pageLink, 20);

			assert.deepStrictEqual(result, {
				text: errorMsg,
				href: pageLink
			});
		});

		it('should default to 150 char limit if not provided', () => {
			const safeString = 'a'.repeat(150);
			assert.strictEqual(checkAnswerlength(safeString, errorMsg, pageLink), undefined);

			const unsafeString = 'a'.repeat(151);
			assert.deepStrictEqual(checkAnswerlength(unsafeString, errorMsg, pageLink), {
				text: errorMsg,
				href: pageLink
			});
		});

		it('should handle null/undefined values safely', () => {
			assert.strictEqual(checkAnswerlength(null as any, errorMsg, pageLink), undefined);
			assert.strictEqual(checkAnswerlength(undefined as any, errorMsg, pageLink), undefined);
		});
	});

	describe('checkRequiredAnswer', () => {
		const errorMsg = 'Required';
		const pageLink = '#input';

		it('should return undefined if value is provided', () => {
			const result = checkRequiredAnswer('valid answer', errorMsg, pageLink);
			assert.strictEqual(result, undefined);
		});

		it('should return error object if value is empty string', () => {
			const result = checkRequiredAnswer('', errorMsg, pageLink);
			assert.deepStrictEqual(result, {
				text: errorMsg,
				href: pageLink
			});
		});

		it('should return error object if value is null', () => {
			const result = checkRequiredAnswer(null as any, errorMsg, pageLink);
			assert.deepStrictEqual(result, {
				text: errorMsg,
				href: pageLink
			});
		});

		it('should return error object if value is undefined', () => {
			const result = checkRequiredAnswer(undefined as any, errorMsg, pageLink);
			assert.deepStrictEqual(result, {
				text: errorMsg,
				href: pageLink
			});
		});
	});

	describe('toCamelCase', () => {
		it('should convert PascalCase to camelCase', () => {
			assert.strictEqual(toCamelCase('ProcedureOne'), 'procedureOne');
			assert.strictEqual(toCamelCase('HearingVenue'), 'hearingVenue');
		});

		it('should leave existing camelCase strings unchanged', () => {
			assert.strictEqual(toCamelCase('procedureOne'), 'procedureOne');
			assert.strictEqual(toCamelCase('myVariable'), 'myVariable');
		});

		it('should handle single character strings', () => {
			assert.strictEqual(toCamelCase('A'), 'a');
			assert.strictEqual(toCamelCase('z'), 'z');
		});

		it('should handle empty strings gracefully', () => {
			assert.strictEqual(toCamelCase(''), '');
		});

		it('should only affect the first character', () => {
			assert.strictEqual(toCamelCase('ALLCAPS'), 'aLLCAPS');
			assert.strictEqual(toCamelCase('With Spaces'), 'with Spaces');
		});
	});
});
