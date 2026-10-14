import assert from 'node:assert';
import { describe, it } from 'node:test';
import { formatPostcode, mapAddressDbToViewModel, mapAddressViewModelToDb } from './address.ts';

describe('Address Utils', () => {
	describe('mapAddressDbToViewModel', () => {
		it('should map DB fields (line1) to ViewModel fields (addressLine1)', () => {
			const dbAddress = {
				line1: '10 Downing St',
				line2: 'Westminster',
				townCity: 'London',
				county: 'Greater London',
				postcode: 'SW1A 2AA'
			};

			const result = mapAddressDbToViewModel(dbAddress);

			assert.deepStrictEqual(result, {
				addressLine1: '10 Downing St',
				addressLine2: 'Westminster',
				townCity: 'London',
				county: 'Greater London',
				postcode: 'SW1A 2AA',
				id: undefined
			});
		});

		it('should return null if input is null or undefined', () => {
			assert.strictEqual(mapAddressDbToViewModel(null), null);
			assert.strictEqual(mapAddressDbToViewModel(undefined), null);
		});

		it('should return null if input is not an object', () => {
			assert.strictEqual(mapAddressDbToViewModel('not-an-object'), null);
			assert.strictEqual(mapAddressDbToViewModel(123), null);
		});

		it('should handle partial DB objects gracefully', () => {
			const dbAddress = {
				line1: 'Just a line'
			};

			const result = mapAddressDbToViewModel(dbAddress);

			assert.strictEqual(result?.addressLine1, 'Just a line');
			assert.strictEqual(result?.addressLine2, undefined);
		});
	});

	describe('mapAddressViewModelToDb', () => {
		it('should map ViewModel fields (addressLine1) to DB fields (line1)', () => {
			const viewAddress = {
				addressLine1: '221B Baker St',
				addressLine2: 'Marylebone',
				townCity: 'London',
				county: '',
				postcode: 'NW1 6XE'
			};

			const result = mapAddressViewModelToDb(viewAddress);

			assert.deepStrictEqual(result, {
				line1: '221B Baker St',
				line2: 'Marylebone',
				townCity: 'London',
				county: '',
				postcode: 'NW1 6XE'
			});
		});

		it('should format postcode when mapping ViewModel fields to DB fields', () => {
			const viewAddress = {
				addressLine1: '221B Baker St',
				addressLine2: 'Marylebone',
				townCity: 'London',
				county: '',
				postcode: 'nw16xe'
			};

			const result = mapAddressViewModelToDb(viewAddress);

			assert.deepStrictEqual(result, {
				line1: '221B Baker St',
				line2: 'Marylebone',
				townCity: 'London',
				county: '',
				postcode: 'NW1 6XE'
			});
		});

		it('should provide default empty strings for missing fields', () => {
			const viewAddress = {
				addressLine1: 'The Burrow'
			};

			const result = mapAddressViewModelToDb(viewAddress);

			assert.deepStrictEqual(result, {
				line1: 'The Burrow',
				line2: '',
				townCity: '',
				county: '',
				postcode: ''
			});
		});

		it('should return undefined if input is null or undefined', () => {
			assert.strictEqual(mapAddressViewModelToDb(null as any), undefined);
			assert.strictEqual(mapAddressViewModelToDb(undefined as any), undefined);
		});

		it('should return undefined if input is not an object', () => {
			assert.strictEqual(mapAddressViewModelToDb('string' as any), undefined);
		});
	});
	describe('formatPostcode', () => {
		it('should uppercase and add a space before the last 3 characters', () => {
			assert.strictEqual(formatPostcode('sw1a2aa'), 'SW1A 2AA');
			assert.strictEqual(formatPostcode('ne301dp'), 'NE30 1DP');
		});

		it('should remove extra spaces before formatting', () => {
			assert.strictEqual(formatPostcode('  s w1a  2aa '), 'SW1A 2AA');
		});

		it('should return empty string for empty values', () => {
			assert.strictEqual(formatPostcode(''), '');
			assert.strictEqual(formatPostcode(undefined), '');
			assert.strictEqual(formatPostcode(null), '');
		});
	});
});
