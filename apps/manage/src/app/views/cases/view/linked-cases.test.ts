import { mockLogger } from '@planning-inspectorate/core/testing';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import {
	applyLinkedCaseRelationships,
	buildPreviousLinkedCases,
	extractLinkedCaseChanges,
	getLinkedCaseDetailRows,
	linkNewCaseToLead,
	resolveLinkedCaseRelationships,
	stripLinkedCaseDetails
} from './linked-cases.ts';

describe('linked-cases', () => {
	describe('getLinkedCaseDetailRows', () => {
		it('should return an empty array when value is not an array', () => {
			assert.deepStrictEqual(getLinkedCaseDetailRows(undefined), []);
			assert.deepStrictEqual(getLinkedCaseDetailRows(null), []);
			assert.deepStrictEqual(getLinkedCaseDetailRows('not-an-array'), []);
			assert.deepStrictEqual(getLinkedCaseDetailRows({}), []);
		});

		it('should return an empty array for an empty array', () => {
			assert.deepStrictEqual(getLinkedCaseDetailRows([]), []);
		});

		it('should keep only rows matching the LinkedCaseDetailInput shape', () => {
			const validRow = { linkedCaseId: 'case-1', linkedCaseIsLead: 'yes' };
			const missingIsLead = { linkedCaseId: 'case-2' };
			const missingCaseId = { linkedCaseIsLead: 'no' };
			const wrongTypes = { linkedCaseId: 1, linkedCaseIsLead: false };
			const notAnObject = 'case-3';
			const nullValue = null;

			const result = getLinkedCaseDetailRows([
				validRow,
				missingIsLead,
				missingCaseId,
				wrongTypes,
				notAnObject,
				nullValue
			]);

			assert.deepStrictEqual(result, [validRow]);
		});
	});

	describe('extractLinkedCaseChanges', () => {
		it('should return undefined when linkedCaseDetails is not present', () => {
			const result = extractLinkedCaseChanges({});
			assert.strictEqual(result, undefined);
		});

		it('should return null lead and empty otherCaseIds when linkedCaseDetails is an empty array', () => {
			const result = extractLinkedCaseChanges({ linkedCaseDetails: [] });
			assert.deepStrictEqual(result, { leadCaseId: null, otherCaseIds: [] });
		});

		it('should identify the lead case and put the rest in otherCaseIds', () => {
			const rawAnswers = {
				linkedCaseDetails: [
					{ linkedCaseId: 'case-1', linkedCaseIsLead: 'no' },
					{ linkedCaseId: 'case-2', linkedCaseIsLead: 'yes' },
					{ linkedCaseId: 'case-3', linkedCaseIsLead: 'no' }
				]
			};

			const result = extractLinkedCaseChanges(rawAnswers);

			assert.deepStrictEqual(result, {
				leadCaseId: 'case-2',
				otherCaseIds: ['case-1', 'case-3']
			});
		});

		it('should return null leadCaseId when no row is marked as lead', () => {
			const rawAnswers = {
				linkedCaseDetails: [
					{ linkedCaseId: 'case-1', linkedCaseIsLead: 'no' },
					{ linkedCaseId: 'case-2', linkedCaseIsLead: 'no' }
				]
			};

			const result = extractLinkedCaseChanges(rawAnswers);

			assert.deepStrictEqual(result, {
				leadCaseId: null,
				otherCaseIds: ['case-1', 'case-2']
			});
		});

		it('should ignore malformed rows mixed in with valid ones', () => {
			const rawAnswers = {
				linkedCaseDetails: [
					{ linkedCaseId: 'case-1', linkedCaseIsLead: 'yes' },
					{ linkedCaseId: 'case-2' },
					'not-a-row'
				]
			};

			const result = extractLinkedCaseChanges(rawAnswers);

			assert.deepStrictEqual(result, {
				leadCaseId: 'case-1',
				otherCaseIds: []
			});
		});

		it('should not mutate rawAnswers', () => {
			const rawAnswers = {
				linkedCaseDetails: [{ linkedCaseId: 'case-1', linkedCaseIsLead: 'yes' }]
			};
			const clone = structuredClone(rawAnswers);

			extractLinkedCaseChanges(rawAnswers);

			assert.deepStrictEqual(rawAnswers, clone);
		});
	});

	describe('applyLinkedCaseRelationships', () => {
		const createMockTx = () => ({
			caseRelationship: {
				deleteMany: mock.fn((_args: unknown) => Promise.resolve()),
				createMany: mock.fn((_args: unknown) => Promise.resolve())
			}
		});

		it('should wipe both previous and new root groups, and create rows under the new lead', async () => {
			const $tx = createMockTx();
			const changes = { leadCaseId: 'lead-case', otherCaseIds: ['sibling-1', 'sibling-2'] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			assert.strictEqual($tx.caseRelationship.deleteMany.mock.calls.length, 2);

			const [wipeCall, clearCall] = $tx.caseRelationship.deleteMany.mock.calls;
			assert.deepStrictEqual(wipeCall.arguments[0], {
				where: { parentCaseId: { in: ['case-1', 'lead-case'] } }
			});
			assert.deepStrictEqual(clearCall.arguments[0], {
				where: { childCaseId: { in: ['case-1', 'sibling-1', 'sibling-2'] } }
			});

			assert.strictEqual($tx.caseRelationship.createMany.mock.calls.length, 1);
			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [
					{ parentCaseId: 'lead-case', childCaseId: 'case-1' },
					{ parentCaseId: 'lead-case', childCaseId: 'sibling-1' },
					{ parentCaseId: 'lead-case', childCaseId: 'sibling-2' }
				]
			});
		});

		it('should include the previous parent in the root wipe set when the case had one', async () => {
			const $tx = createMockTx();
			const changes = { leadCaseId: 'new-lead', otherCaseIds: [] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, 'old-parent');

			const [wipeCall] = $tx.caseRelationship.deleteMany.mock.calls;
			assert.deepStrictEqual(wipeCall.arguments[0], {
				where: { parentCaseId: { in: ['old-parent', 'new-lead'] } }
			});
		});

		it('should dedupe the root wipe set when the previous root equals the new parent', async () => {
			const $tx = createMockTx();
			const changes = { leadCaseId: null, otherCaseIds: [] };

			// no previousParentCaseId, so previousRootCaseId === caseId === newParentCaseId
			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			const [wipeCall] = $tx.caseRelationship.deleteMany.mock.calls;
			assert.deepStrictEqual(wipeCall.arguments[0], {
				where: { parentCaseId: { in: ['case-1'] } }
			});
		});

		it('should use caseId as the parent and otherCaseIds as children when no lead case is designated', async () => {
			const $tx = createMockTx();
			const changes = { leadCaseId: null, otherCaseIds: ['other-1', 'other-2'] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [
					{ parentCaseId: 'case-1', childCaseId: 'other-1' },
					{ parentCaseId: 'case-1', childCaseId: 'other-2' }
				]
			});
		});

		it('should not call createMany when there are no child case ids', async () => {
			const $tx = createMockTx();
			const changes = { leadCaseId: null, otherCaseIds: [] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			assert.strictEqual($tx.caseRelationship.createMany.mock.calls.length, 0);
		});
	});

	describe('linkNewCaseToLead', () => {
		const createMockTx = () => ({
			caseRelationship: {
				create: mock.fn((_args: unknown) => Promise.resolve()),
				deleteMany: mock.fn((_args: unknown) => Promise.resolve()),
				createMany: mock.fn((_args: unknown) => Promise.resolve())
			}
		});

		it('should append a single relationship row without deleting any existing relationships', async () => {
			const $tx = createMockTx();

			await linkNewCaseToLead($tx as any, 'new-case', 'lead-case');

			assert.strictEqual($tx.caseRelationship.create.mock.calls.length, 1);
			assert.deepStrictEqual($tx.caseRelationship.create.mock.calls[0].arguments[0], {
				data: { parentCaseId: 'lead-case', childCaseId: 'new-case' }
			});
			assert.strictEqual($tx.caseRelationship.deleteMany.mock.calls.length, 0);
			assert.strictEqual($tx.caseRelationship.createMany.mock.calls.length, 0);
		});
	});

	describe('stripLinkedCaseDetails', () => {
		it('should remove linkedCaseDetails from the flat data object', () => {
			const flatData: Record<string, any> = { name: 'Case 1', linkedCaseDetails: [{ linkedCaseId: 'case-2' }] };

			stripLinkedCaseDetails(flatData);

			assert.deepStrictEqual(flatData, { name: 'Case 1' });
		});

		it('should be a no-op when linkedCaseDetails is not present', () => {
			const flatData: Record<string, any> = { name: 'Case 1' };

			assert.doesNotThrow(() => stripLinkedCaseDetails(flatData));
			assert.deepStrictEqual(flatData, { name: 'Case 1' });
		});
	});

	describe('buildPreviousLinkedCases', () => {
		it('should return an empty array when neither relationship is present', () => {
			assert.deepStrictEqual(buildPreviousLinkedCases({}), []);
		});

		it('should return an empty array when ParentRelationship is null', () => {
			assert.deepStrictEqual(buildPreviousLinkedCases({ ParentRelationship: null }), []);
		});

		it('should map ChildRelationships to non-lead entries', () => {
			const previousValues = {
				ChildRelationships: [
					{ id: 'rel-1', ChildCase: { id: 'case-2', reference: 'REF-002' } },
					{ id: 'rel-2', ChildCase: { id: 'case-3', reference: 'REF-003' } }
				]
			};

			const result = buildPreviousLinkedCases(previousValues);

			assert.deepStrictEqual(result, [
				{ id: 'rel-1', reference: 'case-2', isLead: false },
				{ id: 'rel-2', reference: 'case-3', isLead: false }
			]);
		});

		it('should append a lead entry for ParentRelationship', () => {
			const previousValues = {
				ParentRelationship: { id: 'rel-parent', ParentCase: { id: 'case-1', reference: 'REF-001' } }
			};

			const result = buildPreviousLinkedCases(previousValues);

			assert.deepStrictEqual(result, [{ id: 'rel-parent', reference: 'case-1', isLead: true }]);
		});

		it('should combine ChildRelationships and ParentRelationship, children first', () => {
			const previousValues = {
				ChildRelationships: [{ id: 'rel-1', ChildCase: { id: 'case-2', reference: 'REF-002' } }],
				ParentRelationship: { id: 'rel-parent', ParentCase: { id: 'case-1', reference: 'REF-001' } }
			};

			const result = buildPreviousLinkedCases(previousValues);

			assert.deepStrictEqual(result, [
				{ id: 'rel-1', reference: 'case-2', isLead: false },
				{ id: 'rel-parent', reference: 'case-1', isLead: true }
			]);
		});
	});

	describe('resolveLinkedCaseRelationships', () => {
		it('should return an empty array when neither relationship is present', () => {
			assert.deepStrictEqual(resolveLinkedCaseRelationships({ id: 'case-1' }), []);
		});

		it('should map ChildRelationships to non-lead entries when there is no ParentRelationship', () => {
			const caseRow = {
				id: 'case-1',
				ChildRelationships: [
					{ id: 'rel-3', ChildCase: { id: 'other-case-10', reference: 'DRO/10' } },
					{ id: 'rel-1', ChildCase: { id: 'other-case-1', reference: 'DRO/1' } }
				]
			};

			const result = resolveLinkedCaseRelationships(caseRow);

			assert.deepStrictEqual(result, [
				{ id: 'rel-3', reference: 'DRO/10', otherCaseId: 'other-case-10', isLead: false },
				{ id: 'rel-1', reference: 'DRO/1', otherCaseId: 'other-case-1', isLead: false }
			]);
		});

		it('should treat the ParentRelationship as the lead case and ignore ChildRelationships, logging an error', () => {
			const caseRow = {
				id: 'case-1',
				ChildRelationships: [{ id: 'rel-3', ChildCase: { id: 'other-case-10', reference: 'DRO/10' } }],
				ParentRelationship: { id: 'rel-2', ParentCase: { id: 'other-case-2', reference: 'DRO/2' } }
			};
			const logger = mockLogger();

			const result = resolveLinkedCaseRelationships(caseRow, logger as any);

			assert.deepStrictEqual(result, [{ id: 'rel-2', reference: 'DRO/2', otherCaseId: 'other-case-2', isLead: true }]);
			assert.strictEqual(logger.error.mock.calls.length, 1);
			assert.deepStrictEqual(logger.error.mock.calls[0].arguments[0], { caseId: 'case-1' });
		});

		it('should not log when ParentRelationship is present but ChildRelationships is empty', () => {
			const caseRow = {
				id: 'case-1',
				ChildRelationships: [],
				ParentRelationship: { id: 'rel-2', ParentCase: { id: 'other-case-2', reference: 'DRO/2' } }
			};
			const logger = mockLogger();

			resolveLinkedCaseRelationships(caseRow, logger as any);

			assert.strictEqual(logger.error.mock.calls.length, 0);
		});

		it('should include sibling cases (other children of the same parent), excluding itself', () => {
			const caseRow = {
				id: 'case-1',
				ParentRelationship: {
					id: 'rel-2',
					ParentCase: {
						id: 'other-case-2',
						reference: 'DRO/2',
						ChildRelationships: [
							{ id: 'rel-2', ChildCase: { id: 'case-1', reference: 'DRO/current' } }, // itself - excluded
							{ id: 'rel-3', ChildCase: { id: 'other-case-10', reference: 'DRO/10' } },
							{ id: 'rel-1', ChildCase: { id: 'other-case-1', reference: 'DRO/1' } }
						]
					}
				}
			};

			const result = resolveLinkedCaseRelationships(caseRow);

			assert.deepStrictEqual(result, [
				{ id: 'rel-2', reference: 'DRO/2', otherCaseId: 'other-case-2', isLead: true },
				{ id: 'rel-3', reference: 'DRO/10', otherCaseId: 'other-case-10', isLead: false },
				{ id: 'rel-1', reference: 'DRO/1', otherCaseId: 'other-case-1', isLead: false }
			]);
		});
	});
});
