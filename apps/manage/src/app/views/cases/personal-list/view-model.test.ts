import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { casesToViewModel } from './view-model.ts';
import type { CaseOfficer } from '../view/types.ts';
import type { CaseListFields } from './types.ts';

describe('casesToViewModel', () => {
	const mockGroupMembers = {
		caseOfficers: [
			{ id: 'user-1', displayName: 'Oscar CaseOfficer' },
			{ id: 'user-2', displayName: 'Oscar Inspector' }
		] as CaseOfficer[]
	};

	it('should map the display names for the Case Officer and Inspectors correctly', () => {
		const mockCases = [
			{
				id: 'case-1',
				reference: 'APP/123',
				CaseOfficer: { idpUserId: 'user-1' },
				Inspectors: [{ Inspector: { idpUserId: 'user-2' } }]
			}
		] as unknown as CaseListFields[];

		const result = casesToViewModel(mockCases, mockGroupMembers);

		assert.strictEqual(result[0].caseOfficerName, 'Oscar CaseOfficer');
		assert.strictEqual(result[0].mappedInspectors[0].displayName, 'Oscar Inspector');
		assert.strictEqual(result[0].reference, 'APP/123');
	});

	it('should return "Unknown" for inspectors and undefined for case officers if they are not in the Entra group', () => {
		const mockCases = [
			{
				id: 'case-2',
				CaseOfficer: { idpUserId: 'ghost-user' },
				Inspectors: [{ Inspector: { idpUserId: 'another-ghost' } }]
			}
		] as unknown as CaseListFields[];

		const result = casesToViewModel(mockCases, mockGroupMembers);

		assert.strictEqual(result[0].caseOfficerName, undefined);
		assert.strictEqual(result[0].mappedInspectors[0].displayName, 'Unknown');
	});

	it('should safely handle cases with no Case Officer and no Inspectors', () => {
		const mockCases = [
			{
				id: 'case-3',
				CaseOfficer: null,
				Inspectors: []
			}
		] as unknown as CaseListFields[];

		const result = casesToViewModel(mockCases, mockGroupMembers);

		assert.strictEqual(result[0].caseOfficerName, undefined);
		assert.deepStrictEqual(result[0].mappedInspectors, []);
	});
});
