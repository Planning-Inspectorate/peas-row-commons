import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	stringToKebab,
	checkAnswerlength,
	checkRequiredAnswer,
	toCamelCase,
	shouldTruncateComment,
	truncateComment,
	nl2br,
	nullEmptyString
} from './strings.ts';

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

	describe('shouldTruncateComment', () => {
		it('should return true if it length > the max length', () => {
			assert.strictEqual(shouldTruncateComment('test comment', 5), true);
		});

		it('should return false if it length < the max length', () => {
			assert.strictEqual(shouldTruncateComment('test comment', 50), false);
		});

		it('should return false if it length === the max length', () => {
			assert.strictEqual(shouldTruncateComment('test', 4), false);
		});

		it('should default to 100 if no max is passed', () => {
			assert.strictEqual(shouldTruncateComment('test'), false);
		});
	});

	describe('truncateComment', () => {
		it('should truncate if it is > max length', () => {
			assert.strictEqual(
				truncateComment('test comment', '/cases', 5),
				'test ... <a class="govuk-link govuk-link--no-visited-state" href="/cases">Read more</a>'
			);
		});

		it('should not truncate if it is < max length', () => {
			assert.strictEqual(truncateComment('test comment', '/cases', 20), 'test comment');
		});

		it('should default to 100 if no max passed in', () => {
			assert.strictEqual(truncateComment('test comment', '/cases'), 'test comment');
		});
	});

	describe('nl2br', () => {
		it('should swap new lines for <br>', () => {
			assert.strictEqual(nl2br('First line\nSecond line\r\nThird line'), 'First line<br>Second line<br>Third line');
			assert.strictEqual(
				nl2br('First line\n\n\n\n\nSecond line\r\nThird line'),
				'First line<br><br><br><br><br>Second line<br>Third line'
			);
		});
	});

	describe('nullEmptyString', () => {
		describe('should return non-string values unchanged', () => {
			const nonStringTests = [
				{ name: 'null', value: null },
				{ name: 'undefined', value: undefined },
				{ name: '1', value: 1 },
				{ name: '0', value: 0 },
				{ name: '0.1', value: 0.1 },
				{ name: 'array', value: ['one', 'two', 'three ', ' '] },
				{ name: 'object', value: { key: 'value' } },
				{ name: 'false', value: false },
				{ name: 'true', value: true }
			];

			for (const test of nonStringTests) {
				it(`returns ${test.name}`, () => {
					assert.deepStrictEqual(nullEmptyString(test.value), test.value);
				});
			}
		});

		describe('should handle string values', () => {
			it('returns non-empty string unchanged', () => {
				assert.strictEqual(nullEmptyString('string string  '), 'string string  ');
			});

			it('returns null for empty string', () => {
				assert.strictEqual(nullEmptyString(''), null);
			});

			it('returns null for whitespace-only string', () => {
				assert.strictEqual(nullEmptyString('   '), null);
			});
		});
	});
});
