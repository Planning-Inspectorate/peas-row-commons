import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatAddress, formatDate, formatValue, formatNumber } from './audit-formatters.ts';

describe('Audit Formatters', () => {
	describe('formatAddress', () => {
		it('should return a comma-separated string from DB-shaped address', () => {
			const address = {
				line1: '221b Baker Street',
				line2: 'Marylebone',
				townCity: 'London',
				county: 'Greater London',
				postcode: 'NW1 6XE'
			};

			assert.strictEqual(formatAddress(address), '221b Baker Street, Marylebone, London, Greater London, NW1 6XE');
		});

		it('should return a comma-separated string from form-shaped address', () => {
			const address = {
				addressLine1: 'Buckingham Palace',
				addressLine2: '',
				townCity: 'London',
				county: '',
				postcode: 'SW1A 1AA'
			};

			assert.strictEqual(formatAddress(address), 'Buckingham Palace, London, SW1A 1AA');
		});

		it('should skip null/undefined/empty fields', () => {
			const address = {
				line1: '10 Downing Street',
				line2: null,
				townCity: 'London',
				county: undefined,
				postcode: 'SW1A 2AA'
			};

			assert.strictEqual(formatAddress(address), '10 Downing Street, London, SW1A 2AA');
		});

		it('should return "-" for null input', () => {
			assert.strictEqual(formatAddress(null), '-');
		});

		it('should return "-" for undefined input', () => {
			assert.strictEqual(formatAddress(undefined), '-');
		});

		it('should return "-" for an empty object', () => {
			assert.strictEqual(formatAddress({}), '-');
		});

		it('should prefer DB-shaped fields over form-shaped fields', () => {
			const address = {
				line1: 'DB Line 1',
				addressLine1: 'Form Line 1',
				townCity: 'London',
				postcode: 'SW1'
			};

			assert.strictEqual(formatAddress(address), 'DB Line 1, London, SW1');
		});
	});

	describe('formatDate', () => {
		it('should format a Date object', () => {
			const date = new Date('2026-10-10T00:00:00.000Z');

			assert.strictEqual(formatDate(date), '10 October 2026');
		});

		it('should format an ISO date string', () => {
			assert.strictEqual(formatDate('2025-01-15T00:00:00.000Z'), '15 January 2025');
		});

		it('should format a date-only string', () => {
			assert.strictEqual(formatDate('2024-03-27'), '27 March 2024');
		});

		it('should return "-" for null', () => {
			assert.strictEqual(formatDate(null), '-');
		});

		it('should return "-" for undefined', () => {
			assert.strictEqual(formatDate(undefined), '-');
		});

		it('should return "-" for an empty string', () => {
			assert.strictEqual(formatDate(''), '-');
		});

		it('should return "-" for an invalid date string', () => {
			assert.strictEqual(formatDate('not-a-date'), '-');
		});
	});

	describe('formatValue', () => {
		it('should return "-" for null', () => {
			assert.strictEqual(formatValue(null), '-');
		});

		it('should return "-" for undefined', () => {
			assert.strictEqual(formatValue(undefined), '-');
		});

		it('should return "-" for an empty string', () => {
			assert.strictEqual(formatValue(''), '-');
		});

		it('should format a Date object using formatDate', () => {
			const date = new Date('2026-10-10T00:00:00.000Z');

			assert.strictEqual(formatValue(date), '10 October 2026');
		});

		it('should return "Yes" for true', () => {
			assert.strictEqual(formatValue(true), 'Yes');
		});

		it('should return "No" for false', () => {
			assert.strictEqual(formatValue(false), 'No');
		});

		it('should stringify a number', () => {
			assert.strictEqual(formatValue(42), '42');
		});

		it('should stringify a string value', () => {
			assert.strictEqual(formatValue('hello'), 'hello');
		});

		it('should stringify zero', () => {
			assert.strictEqual(formatValue(0), '0');
		});
	});

	describe('formatNumber', () => {
		it('should return "-" for null', () => {
			assert.strictEqual(formatNumber(null), '-');
		});

		it('should return "-" for undefined', () => {
			assert.strictEqual(formatNumber(undefined), '-');
		});

		it('should return "-" for an empty string', () => {
			assert.strictEqual(formatNumber(''), '-');
		});

		it('should stringify a number', () => {
			assert.strictEqual(formatNumber(5), '5');
		});

		it('should stringify a decimal number', () => {
			assert.strictEqual(formatNumber(0.5), '0.5');
		});

		it('should stringify zero', () => {
			assert.strictEqual(formatNumber(0), '0');
		});

		it('should stringify a numeric string', () => {
			assert.strictEqual(formatNumber('10'), '10');
		});
	});
});
