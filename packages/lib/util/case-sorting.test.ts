import assert from 'node:assert';
import { describe, it } from 'node:test';
import { sortLinkedCases, sortRelatedCases } from './case-sorting.ts';

describe('case-sorting', () => {
	describe('sortLinkedCases', () => {
		it('should sort lead case first', () => {
			const cases = [
				{ id: '1', reference: 'CASE/001' },
				{ id: '2', reference: 'CASE/002' },
				{ id: '3', reference: 'CASE/003' }
			];
			const leadCaseId = '2';

			const result = sortLinkedCases(cases, leadCaseId);

			assert.strictEqual(result[0].reference, 'CASE/002');
			assert.strictEqual(result[0].id, leadCaseId);
		});

		it('should sort alphanumerically within lead and non-lead groups', () => {
			const cases = [
				{ id: '1', reference: 'CASE/10' },
				{ id: '2', reference: 'CASE/02' },
				{ id: '3', reference: 'CASE/1' },
				{ id: '4', reference: 'CASE/20' }
			];

			const leadCaseId = '3';

			const result = sortLinkedCases(cases, leadCaseId);

			// Lead case first, then alphanumeric
			assert.strictEqual(result[0].reference, 'CASE/1');
			assert.strictEqual(result[0].id, leadCaseId);
			// Non-lead cases, alphanumeric
			assert.strictEqual(result[1].reference, 'CASE/02');
			assert.strictEqual(result[2].reference, 'CASE/10');
			assert.strictEqual(result[3].reference, 'CASE/20');
		});

		it('should not mutate the original array', () => {
			const cases = [
				{ id: '1', reference: 'CASE/10' },
				{ id: '2', reference: 'CASE/02' },
				{ id: '3', reference: 'CASE/1' },
				{ id: '4', reference: 'CASE/20' }
			];

			const originalLength = cases.length;
			const originalFirst = cases[0];

			sortLinkedCases(cases);

			assert.strictEqual(cases.length, originalLength);
			assert.strictEqual(cases[0], originalFirst);
		});
	});

	describe('sortRelatedCases', () => {
		it('should sort alphanumerically by reference', () => {
			const cases = [{ reference: 'CASE/10' }, { reference: 'CASE/2' }, { reference: 'CASE/1' }];

			const result = sortRelatedCases(cases);

			assert.strictEqual(result[0].reference, 'CASE/1');
			assert.strictEqual(result[1].reference, 'CASE/2');
			assert.strictEqual(result[2].reference, 'CASE/10');
		});

		it('should push null/empty references to the start', () => {
			const cases = [{ reference: null }, { reference: 'CASE/001' }, { reference: '' }, { reference: 'CASE/002' }];

			const result = sortRelatedCases(cases);

			assert.strictEqual(result[0].reference, null);
			assert.strictEqual(result[1].reference, '');
			assert.strictEqual(result[2].reference, 'CASE/001');
			assert.strictEqual(result[3].reference, 'CASE/002');
		});

		it('should not mutate the original array', () => {
			const cases = [{ reference: 'CASE/002' }, { reference: 'CASE/001' }];
			const originalFirst = cases[0];

			sortRelatedCases(cases);

			assert.strictEqual(cases[0], originalFirst);
		});
	});
});
