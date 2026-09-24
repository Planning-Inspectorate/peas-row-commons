import { mockLogger } from '@planning-inspectorate/core/testing';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import {
	applyLinkedCaseRelationships,
	buildExistingLeadCaseMap,
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

	describe('buildExistingLeadCaseMap', () => {
		it('should return an empty map when there are no other cases', () => {
			assert.deepStrictEqual(buildExistingLeadCaseMap([]), new Map());
		});

		it('should ignore cases without a ParentRelationship', () => {
			const result = buildExistingLeadCaseMap([
				{ id: 'case-1', reference: 'REF-001' },
				{ id: 'case-2', reference: 'REF-002', ParentRelationship: null }
			]);

			assert.deepStrictEqual(result, new Map());
		});

		it('should map each case with a ParentRelationship to its existing parent case id', () => {
			const result = buildExistingLeadCaseMap([
				{ id: 'case-1', reference: 'REF-001', ParentRelationship: { parentCaseId: 'case-lead' } },
				{ id: 'case-2', reference: 'REF-002' }
			]);

			assert.deepStrictEqual(result, new Map([['case-1', 'case-lead']]));
		});

		it('should map a case with its own ChildRelationships (an existing lead) to itself', () => {
			const result = buildExistingLeadCaseMap([
				{ id: 'case-lead', reference: 'REF-LEAD', _count: { ChildRelationships: 1 } },
				{ id: 'case-2', reference: 'REF-002', _count: { ChildRelationships: 0 } }
			]);

			assert.deepStrictEqual(result, new Map([['case-lead', 'case-lead']]));
		});

		it('should prefer ParentRelationship over ChildRelationships count when both are present (invalid state)', () => {
			const result = buildExistingLeadCaseMap([
				{
					id: 'case-1',
					reference: 'REF-001',
					ParentRelationship: { parentCaseId: 'case-lead' },
					_count: { ChildRelationships: 2 }
				}
			]);

			assert.deepStrictEqual(result, new Map([['case-1', 'case-lead']]));
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
		const createMockTx = (childrenByParentCaseId: Record<string, { childCaseId: string }[]> = {}) => ({
			caseRelationship: {
				findMany: mock.fn(({ where }: { where: { parentCaseId: string | { in: string[] } } }) => {
					const parentCaseIds = typeof where.parentCaseId === 'string' ? [where.parentCaseId] : where.parentCaseId.in;

					return Promise.resolve(
						parentCaseIds.flatMap((parentCaseId) =>
							(childrenByParentCaseId[parentCaseId] ?? []).map((relationship) => ({ parentCaseId, ...relationship }))
						)
					);
				}),
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

		it('should preserve the lead case existing children not listed in this edit', async () => {
			const $tx = createMockTx({
				'lead-case': [{ childCaseId: 'existing-child' }, { childCaseId: 'sibling-1' }]
			});
			const changes = { leadCaseId: 'lead-case', otherCaseIds: ['sibling-1'] };

			const result = await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			assert.strictEqual($tx.caseRelationship.findMany.mock.calls.length, 1);

			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [
					{ parentCaseId: 'lead-case', childCaseId: 'case-1' },
					{ parentCaseId: 'lead-case', childCaseId: 'sibling-1' },
					{ parentCaseId: 'lead-case', childCaseId: 'existing-child' }
				]
			});

			// The returned final group is ground truth for auditing - it must include
			// the merged-in existing-child even though it was never part of this edit.
			// mergedLeadOldGroup must also include sibling-1: it was already one of
			// lead-case's children *before* this edit, so its true prior group includes
			// it even though it's also explicitly resubmitted via otherCaseIds - dropping
			// it here would make the audit resolver wrongly report it as newly added.
			assert.deepStrictEqual(result, {
				leadCaseId: 'lead-case',
				childCaseIds: ['case-1', 'sibling-1', 'existing-child'],
				mergedLeadOldGroup: { leadCaseId: 'lead-case', childCaseIds: ['existing-child', 'sibling-1'] }
			});
		});

		it('should include a resubmitted pre-existing child in mergedLeadOldGroup without duplicating its relationship row', async () => {
			// lead-case already has children resubmitted-child (explicitly re-listed in
			// this edit's otherCaseIds) and untouched-child (not mentioned at all).
			const $tx = createMockTx({
				'lead-case': [{ childCaseId: 'resubmitted-child' }, { childCaseId: 'untouched-child' }]
			});
			const changes = { leadCaseId: 'lead-case', otherCaseIds: ['resubmitted-child'] };

			const result = await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			// Only one CaseRelationship row for resubmitted-child - no duplicate created
			// for the id that was both pre-existing and resubmitted.
			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [
					{ parentCaseId: 'lead-case', childCaseId: 'case-1' },
					{ parentCaseId: 'lead-case', childCaseId: 'resubmitted-child' },
					{ parentCaseId: 'lead-case', childCaseId: 'untouched-child' }
				]
			});

			// mergedLeadOldGroup reflects the lead's full true prior membership, so
			// resubmitted-child is diffed as UPDATED (unchanged relationship) rather
			// than being mistaken for a brand new addition.
			assert.deepStrictEqual(result.mergedLeadOldGroup, {
				leadCaseId: 'lead-case',
				childCaseIds: ['resubmitted-child', 'untouched-child']
			});
		});

		it('should not report a mergedLeadOldGroup when the designated lead had no pre-existing children', async () => {
			// lead-case has no existing children at all - it's not a genuinely established
			// group, so this is a brand new pairing, not a merge of two existing groups.
			const $tx = createMockTx({ 'lead-case': [] });
			const changes = { leadCaseId: 'lead-case', otherCaseIds: ['sibling-1'] };

			const result = await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			assert.deepStrictEqual(result, {
				leadCaseId: 'lead-case',
				childCaseIds: ['case-1', 'sibling-1']
			});
			assert.strictEqual(Object.hasOwn(result, 'mergedLeadOldGroup'), false);
		});

		it('should merge two established groups when the case being edited was itself a lead with its own child', async () => {
			// case-X was previously the lead of its own group with case-Y as its only child.
			// case-1 is a separate, already-established lead with children case-2 and case-3.
			// The edit screen for case-X showed its complete own child list (case-Y), which
			// the user kept, while reassigning the lead to case-1 - merging the two groups.
			const $tx = createMockTx({
				'case-X': [{ childCaseId: 'case-Y' }],
				'case-1': [{ childCaseId: 'case-2' }, { childCaseId: 'case-3' }]
			});
			const changes = { leadCaseId: 'case-1', otherCaseIds: ['case-Y'] };

			const result = await applyLinkedCaseRelationships($tx as any, 'case-X', changes, null);

			// Only case-1's existing children need fetching - case-X's own child was
			// already explicitly kept via otherCaseIds, not re-fetched.
			assert.strictEqual($tx.caseRelationship.findMany.mock.calls.length, 1);
			assert.deepStrictEqual($tx.caseRelationship.findMany.mock.calls[0].arguments[0], {
				where: { parentCaseId: 'case-1' },
				select: { parentCaseId: true, childCaseId: true }
			});

			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [
					{ parentCaseId: 'case-1', childCaseId: 'case-X' },
					{ parentCaseId: 'case-1', childCaseId: 'case-Y' },
					{ parentCaseId: 'case-1', childCaseId: 'case-2' },
					{ parentCaseId: 'case-1', childCaseId: 'case-3' }
				]
			});

			assert.deepStrictEqual(result, {
				leadCaseId: 'case-1',
				childCaseIds: ['case-X', 'case-Y', 'case-2', 'case-3'],
				mergedLeadOldGroup: { leadCaseId: 'case-1', childCaseIds: ['case-2', 'case-3'] }
			});
		});

		it('should not resurrect a sibling deliberately removed by a case already under the same lead', async () => {
			// case-1 was already a child of lead-case, alongside siblings removed-sibling and kept-sibling.
			// The user's edit screen showed the full sibling list and removed 'removed-sibling'.
			const $tx = createMockTx({
				'lead-case': [{ childCaseId: 'case-1' }, { childCaseId: 'removed-sibling' }, { childCaseId: 'kept-sibling' }]
			});
			const changes = { leadCaseId: 'lead-case', otherCaseIds: ['kept-sibling'] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, 'lead-case');

			// Same lead as before, so no fetch is needed at all - the removed sibling must
			// not be preserved.
			assert.strictEqual($tx.caseRelationship.findMany.mock.calls.length, 0);
			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [
					{ parentCaseId: 'lead-case', childCaseId: 'case-1' },
					{ parentCaseId: 'lead-case', childCaseId: 'kept-sibling' }
				]
			});
		});

		it('should not treat the case being edited as its own preserved child', async () => {
			// case-1 was already a child of lead-case before this edit
			const $tx = createMockTx({ 'lead-case': [{ childCaseId: 'case-1' }] });
			const changes = { leadCaseId: 'lead-case', otherCaseIds: [] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, 'lead-case');

			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [{ parentCaseId: 'lead-case', childCaseId: 'case-1' }]
			});
		});

		it('should not query for existing lead children when no lead case is designated', async () => {
			const $tx = createMockTx();
			const changes = { leadCaseId: null, otherCaseIds: ['other-1'] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			assert.strictEqual($tx.caseRelationship.findMany.mock.calls.length, 0);
		});

		it("should not resurrect this case's own previous children when it was previously the root of its own group", async () => {
			// case-1 was previously the root of its own group with 'old-child' as a child.
			// The edit screen showed this complete list, and the user's submitted
			// otherCaseIds (empty) deliberately dropped 'old-child' - it must not be
			// carried over to the new lead.
			const $tx = createMockTx({ 'case-1': [{ childCaseId: 'old-child' }], 'new-lead': [] });
			const changes = { leadCaseId: 'new-lead', otherCaseIds: [] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			assert.strictEqual($tx.caseRelationship.findMany.mock.calls.length, 1);
			assert.deepStrictEqual($tx.caseRelationship.findMany.mock.calls[0].arguments[0], {
				where: { parentCaseId: 'new-lead' },
				select: { parentCaseId: true, childCaseId: true }
			});

			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [{ parentCaseId: 'new-lead', childCaseId: 'case-1' }]
			});
		});

		it('should not carry over old children when this case remains the lead', async () => {
			// no leadCaseId submitted, so case-1 stays the lead/root of its own group
			const $tx = createMockTx({ 'case-1': [{ childCaseId: 'old-child' }] });
			const changes = { leadCaseId: null, otherCaseIds: ['other-1'] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, null);

			assert.strictEqual($tx.caseRelationship.findMany.mock.calls.length, 0);
			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [{ parentCaseId: 'case-1', childCaseId: 'other-1' }]
			});
		});

		it('should not carry over old children when this case previously had a parent (was already a child)', async () => {
			// this case had a parent already, so it wasn't the root of its own group -
			// it can't have had its own ChildRelationships as a child
			const $tx = createMockTx({ 'case-1': [{ childCaseId: 'stray-row' }] });
			const changes = { leadCaseId: 'new-lead', otherCaseIds: [] };

			await applyLinkedCaseRelationships($tx as any, 'case-1', changes, 'old-parent');

			assert.strictEqual($tx.caseRelationship.findMany.mock.calls.length, 1);
			assert.deepStrictEqual($tx.caseRelationship.createMany.mock.calls[0].arguments[0], {
				data: [{ parentCaseId: 'new-lead', childCaseId: 'case-1' }]
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
				{ caseId: 'case-2', isLead: false },
				{ caseId: 'case-3', isLead: false }
			]);
		});

		it('should append a lead entry for ParentRelationship', () => {
			const previousValues = {
				ParentRelationship: { id: 'rel-parent', ParentCase: { id: 'case-1', reference: 'REF-001' } }
			};

			const result = buildPreviousLinkedCases(previousValues);

			assert.deepStrictEqual(result, [{ caseId: 'case-1', isLead: true }]);
		});

		it('should combine ChildRelationships and ParentRelationship, children first', () => {
			const previousValues = {
				id: 'case-0',
				ParentRelationship: {
					id: 'rel-parent',
					ParentCase: {
						id: 'case-1',
						reference: 'REF-001',
						ChildRelationships: [{ id: 'rel-1', ChildCase: { id: 'case-2', reference: 'REF-002' } }]
					}
				}
			};

			const result = buildPreviousLinkedCases(previousValues);

			assert.deepStrictEqual(result, [
				{ caseId: 'case-1', isLead: true },
				{ caseId: 'case-2', isLead: false }
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
