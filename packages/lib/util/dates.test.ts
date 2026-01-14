import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	dateISOStringToDisplayTime12hr,
	dateISOStringToDisplayDate,
	getDayFromISODate,
	safeConvertTo24Hour
} from './dates.ts';

describe('Date Helpers', () => {
	describe('dateISOStringToDisplayTime12hr', () => {
		it('should format time correctly in GMT (Winter)', () => {
			// 14:30 UTC in Winter is 2:30pm London
			const input = new Date('2024-01-15T14:30:00.000Z');
			const result = dateISOStringToDisplayTime12hr(input);
			assert.strictEqual(result, '2:30pm');
		});

		it('should format time correctly in BST (Summer)', () => {
			// 14:30 UTC in Summer is 3:30pm London (BST is UTC+1)
			const input = new Date('2024-07-15T14:30:00.000Z');
			const result = dateISOStringToDisplayTime12hr(input);
			assert.strictEqual(result, '3:30pm');
		});

		it('should handle midnight correctly', () => {
			const input = new Date('2024-01-15T00:00:00.000Z');
			const result = dateISOStringToDisplayTime12hr(input);
			assert.strictEqual(result, '12:00am');
		});

		it('should return empty string for null or undefined', () => {
			assert.strictEqual(dateISOStringToDisplayTime12hr(null as any), '');
			assert.strictEqual(dateISOStringToDisplayTime12hr(undefined as any), '');
		});

		it('should return empty string for invalid dates', () => {
			const result = dateISOStringToDisplayTime12hr('not-a-date' as any);
			assert.strictEqual(result, '');
		});
	});

	describe('dateISOStringToDisplayDate', () => {
		it('should format date in d MMMM yyyy format', () => {
			const input = new Date('2024-01-15T12:00:00.000Z');
			const result = dateISOStringToDisplayDate(input);
			assert.strictEqual(result, '15 January 2024');
		});

		it('should respect timezone shift (late night UTC is next day London BST)', () => {
			// 11:30 PM UTC on July 1st is 12:30 AM July 2nd in London (BST)
			const input = new Date('2024-07-01T23:30:00.000Z');
			const result = dateISOStringToDisplayDate(input);
			assert.strictEqual(result, '2 July 2024');
		});

		it('should return empty string for null input by default', () => {
			assert.strictEqual(dateISOStringToDisplayDate(null as any), '');
		});

		it('should return custom fallback for null input', () => {
			assert.strictEqual(dateISOStringToDisplayDate(null as any, 'N/A'), 'N/A');
		});

		it('should handle invalid dates gracefully', () => {
			assert.strictEqual(dateISOStringToDisplayDate('invalid' as any), '');
		});
	});

	describe('getDayFromISODate', () => {
		it('should return the correct day of the week', () => {
			// Jan 15 2024 is a Monday
			const input = new Date('2024-01-15T12:00:00.000Z');
			const result = getDayFromISODate(input);
			assert.strictEqual(result, 'Monday');
		});

		it('should respect timezone shift for day calculation', () => {
			// Friday night UTC 11pm -> Saturday morning London BST
			// June 7 2024 is Friday. 23:00 UTC is 00:00 BST (Saturday June 8)
			const input = new Date('2024-06-07T23:00:00.000Z');
			const result = getDayFromISODate(input);
			assert.strictEqual(result, 'Saturday');
		});

		it('should return empty string for missing input', () => {
			assert.strictEqual(getDayFromISODate(null as any), '');
		});
	});
	describe('safeConvertTo24Hour', () => {
		it('should convert 12am to 0', () => {
			const result = safeConvertTo24Hour(12, 'am');
			assert.strictEqual(result, 0);
		});

		it('should convert 12pm to 12', () => {
			const result = safeConvertTo24Hour(12, 'pm');
			assert.strictEqual(result, 12);
		});

		it('should convert 1pm to 13', () => {
			const result = safeConvertTo24Hour(1, 'pm');
			assert.strictEqual(result, 13);
		});
	});
});
