import { describe, it, mock, before } from 'node:test';
import assert from 'node:assert';
import {
	referenceDataToRadioOptions,
	generateConditionalOptions,
	getChildPageOptions,
	getParentPageOptions
} from './questions-utils.ts';

describe('Questions Utils', () => {
	describe('referenceDataToRadioOptions', () => {
		it('should map id to value and displayName to text', () => {
			const input = { id: 'ref-1', displayName: 'Reference One' };
			const result = referenceDataToRadioOptions(input);

			assert.deepStrictEqual(result, {
				value: 'ref-1',
				text: 'Reference One'
			});
		});
	});

	describe('generateConditionalOptions', () => {
		const rawData = [
			{ id: 'opt-1', displayName: 'Option 1' },
			{ id: 'opt-2', displayName: 'Option 2' },
			{ id: 'opt-3', displayName: 'Option 3' }
		];

		it('should map basic options without conditionals', () => {
			const result = generateConditionalOptions(rawData, {});

			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].value, 'opt-1');
			assert.strictEqual(result[0].conditional, undefined);

			// Should not have "Other"
			assert.strictEqual(
				result.find((r) => r.value === 'other'),
				undefined
			);
		});

		it('should add "Other" option when addOther is true', () => {
			const result = generateConditionalOptions(rawData, { addOther: true });

			assert.strictEqual(result.length, 4);
			const otherOpt = result[3];
			assert.strictEqual(otherOpt.text, 'Other');
			assert.strictEqual(otherOpt.value, 'other');
			assert.deepStrictEqual(otherOpt.conditional, {
				type: 'textarea',
				fieldName: 'text',
				question: '',
				inputClasses: 'govuk-!-width-one-half'
			});
		});

		it('should add conditional fields to specific items by index', () => {
			const keysToMakeConditional = ['opt-1', 'opt-3'];

			const result = generateConditionalOptions(rawData, {
				conditionalKeys: keysToMakeConditional as any
			});

			assert.ok(result[0].conditional, 'opt-1 should have conditional');
			assert.strictEqual(result[0].conditional.type, 'textarea');

			assert.strictEqual(result[1].conditional, undefined, 'opt-2 should NOT have conditional');

			assert.ok(result[2].conditional, 'opt-3 should have conditional');
		});

		it('should ignore invalid conditional keys (indices out of bounds)', () => {
			const result = generateConditionalOptions(rawData, {
				conditionalKeys: ['fakeKey'] as any
			});

			// Should just return the mapped options without crashing
			assert.strictEqual(result.length, 3);
			result.forEach((opt) => assert.strictEqual(opt.conditional, undefined));
		});
	});
	describe('Parent/Child Procedure Options', () => {
		const mockRealData = [
			{ id: 'hearing', displayName: 'Hearing' },
			{ id: 'inquiry', displayName: 'Inquiry' },
			{ id: 'arsv', displayName: 'ARSV' },
			{ id: 'asv', displayName: 'ASV' },
			{ id: 'usv', displayName: 'USV' }
		];

		const mockGroups = [
			{ id: 'site-visit', displayName: 'Site visit' },
			{ id: 'admin', displayName: 'Admin' }
		];

		const mockRelationships = {
			'site-visit': ['arsv', 'asv', 'usv'],
			admin: ['case-officer']
		};

		describe('getParentPageOptions', () => {
			it('should return a mix of Groups and Orphan procedures', () => {
				const result = getParentPageOptions(mockRealData, mockGroups, mockRelationships);

				assert.strictEqual(result.length, 4);

				assert.strictEqual(
					result.find((r) => r.id === 'arsv'),
					undefined
				);
				assert.strictEqual(
					result.find((r) => r.id === 'asv'),
					undefined
				);

				assert.ok(result.find((r) => r.id === 'hearing'));
				assert.ok(result.find((r) => r.id === 'site-visit'));
			});

			it('should sort the combined list alphabetically by displayName', () => {
				const result = getParentPageOptions(mockRealData, mockGroups, mockRelationships);

				assert.strictEqual(result[0].displayName, 'Admin');
				assert.strictEqual(result[1].displayName, 'Hearing');
				assert.strictEqual(result[2].displayName, 'Inquiry');
				assert.strictEqual(result[3].displayName, 'Site visit');
			});

			it('should handle cases with no groups (only orphans)', () => {
				const result = getParentPageOptions(mockRealData, [], {});

				assert.strictEqual(result.length, 5);
				assert.strictEqual(result[0].displayName, 'ARSV'); // Sorted
			});
		});

		describe('getChildPageOptions', () => {
			it('should return only the real data points for the selected group', () => {
				const result = getChildPageOptions('site-visit', mockRealData, mockRelationships);

				assert.strictEqual(result.length, 3);
				assert.ok(result.find((r) => r.id === 'arsv'));
				assert.ok(result.find((r) => r.id === 'asv'));
				assert.ok(result.find((r) => r.id === 'usv'));

				assert.strictEqual(
					result.find((r) => r.id === 'hearing'),
					undefined
				);
			});

			it('should return an empty array if the selected ID is not a group (e.g. an orphan)', () => {
				const result = getChildPageOptions('hearing', mockRealData, mockRelationships);

				assert.deepStrictEqual(result, []);
			});

			it('should safely ignore IDs in the relationship map that do not exist in real data', () => {
				const result = getChildPageOptions('admin', mockRealData, mockRelationships);

				assert.deepStrictEqual(result, []);
			});

			it('should return empty array if group ID does not exist', () => {
				const result = getChildPageOptions('non-existent-group', mockRealData, mockRelationships);
				assert.deepStrictEqual(result, []);
			});
		});
	});
});
