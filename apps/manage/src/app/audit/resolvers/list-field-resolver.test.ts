import type { RelatedCase } from '@pins/peas-row-commons-database/src/client/client.ts';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { LinkedCaseAuditSource } from '../../views/cases/view/types.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import { resolveLinkedCaseAudits, resolveRelatedCaseAudits } from './list-field-resolver.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-performing-action';

function buildOldRelatedCase(id: string, reference: string): RelatedCase {
	return { id, reference, caseId: CASE_ID } as unknown as RelatedCase;
}

function buildOldLinkedCase(caseId: string, isLead: boolean): LinkedCaseAuditSource {
	return { caseId, isLead };
}

describe('resolveRelatedCaseAudits', () => {
	describe('additions', () => {
		it('should detect a new related case without an ID as added', () => {
			const oldCases: RelatedCase[] = [];
			const newCases = [{ relatedCaseReference: '123456' }];

			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.RELATED_CASE_ADDED);
			assert.strictEqual(entries[0].metadata?.reference, '123456');
		});

		it('should detect a new related case with an unknown ID as added', () => {
			const oldCases: RelatedCase[] = [buildOldRelatedCase('id-1', 'existing-ref')];
			const newCases = [
				{ id: 'id-1', relatedCaseReference: 'existing-ref' },
				{ id: 'id-new', relatedCaseReference: 'new-ref' }
			];

			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.RELATED_CASE_ADDED);
			assert.strictEqual(entries[0].metadata?.reference, 'new-ref');
		});

		it('should detect multiple additions', () => {
			const oldCases: RelatedCase[] = [];
			const newCases = [{ relatedCaseReference: 'ref-1' }, { relatedCaseReference: 'ref-2' }];

			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 2);
			assert.ok(entries.every((e) => e.action === AUDIT_ACTIONS.RELATED_CASE_ADDED));
		});
	});

	describe('deletions', () => {
		it('should detect a related case being removed', () => {
			const oldCases = [buildOldRelatedCase('id-1', '123456')];
			const newCases: { id?: string; relatedCaseReference: string }[] = [];

			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.RELATED_CASE_DELETED);
			assert.strictEqual(entries[0].metadata?.reference, '123456');
		});

		it('should detect the correct case removed from the middle of a list', () => {
			const oldCases = [
				buildOldRelatedCase('id-1', 'first'),
				buildOldRelatedCase('id-2', 'second'),
				buildOldRelatedCase('id-3', 'third')
			];
			const newCases = [
				{ id: 'id-1', relatedCaseReference: 'first' },
				{ id: 'id-3', relatedCaseReference: 'third' }
			];

			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.RELATED_CASE_DELETED);
			assert.strictEqual(entries[0].metadata?.reference, 'second');
		});
	});

	describe('updates', () => {
		it('should detect a reference being changed', () => {
			const oldCases = [buildOldRelatedCase('id-1', '123')];
			const newCases = [{ id: 'id-1', relatedCaseReference: '123A' }];

			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.RELATED_CASE_UPDATED);
			assert.strictEqual(entries[0].metadata?.oldValue, '123');
			assert.strictEqual(entries[0].metadata?.newValue, '123A');
		});

		it('should not produce an entry when reference has not changed', () => {
			const oldCases = [buildOldRelatedCase('id-1', '123')];
			const newCases = [{ id: 'id-1', relatedCaseReference: '123' }];

			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('combined operations', () => {
		it('should detect add, delete, and update in a single diff', () => {
			const oldCases = [buildOldRelatedCase('id-1', 'first'), buildOldRelatedCase('id-2', 'second')];
			const newCases = [{ id: 'id-1', relatedCaseReference: 'first-updated' }, { relatedCaseReference: 'third' }];

			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			const added = entries.filter((e) => e.action === AUDIT_ACTIONS.RELATED_CASE_ADDED);
			const deleted = entries.filter((e) => e.action === AUDIT_ACTIONS.RELATED_CASE_DELETED);
			const updated = entries.filter((e) => e.action === AUDIT_ACTIONS.RELATED_CASE_UPDATED);

			assert.strictEqual(added.length, 1);
			assert.strictEqual(added[0].metadata?.reference, 'third');

			assert.strictEqual(deleted.length, 1);
			assert.strictEqual(deleted[0].metadata?.reference, 'second');

			assert.strictEqual(updated.length, 1);
			assert.strictEqual(updated[0].metadata?.oldValue, 'first');
			assert.strictEqual(updated[0].metadata?.newValue, 'first-updated');
		});
	});

	describe('no changes', () => {
		it('should return no entries when lists are identical', () => {
			const oldCases = [buildOldRelatedCase('id-1', '123')];
			const newCases = [{ id: 'id-1', relatedCaseReference: '123' }];

			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 0);
		});

		it('should return no entries when both lists are empty', () => {
			const entries = resolveRelatedCaseAudits(CASE_ID, USER_ID, [], []);

			assert.strictEqual(entries.length, 0);
		});
	});
});

describe('resolveLinkedCaseAudits', () => {
	describe('Linked case group changes', () => {
		describe('additions', () => {
			it('should create add entries for every case in a newly-created linked group', () => {
				const oldCases: LinkedCaseAuditSource[] = [];
				const newCases = [
					{ linkedCaseId: 'case-b', linkedCaseIsLead: 'no' },
					{ linkedCaseId: 'case-c', linkedCaseIsLead: 'no' }
				];

				const linkedCaseReferenceMap = [
					{ id: CASE_ID, reference: 'CASE-1' },
					{ id: 'case-b', reference: 'CASE-B' },
					{ id: 'case-c', reference: 'CASE-C' }
				];

				const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, linkedCaseReferenceMap, oldCases, newCases);

				assert.strictEqual(entries.length, 3);

				for (const entry of entries) {
					assert.strictEqual(entry.action, AUDIT_ACTIONS.LINKED_CASE_GROUP_ADDED);
					assert.strictEqual(entry.metadata?.fieldName, 'linked cases');

					const members = entry.metadata?.newLinkedCases as Array<{ reference: string; isLead: boolean }>;

					assert.strictEqual(members.filter((member) => member.isLead).length, 1);
					assert.strictEqual(members.find((member) => member.isLead)?.reference, 'CASE-1');
				}
			});

			it('should create update entries for cases in an existing linked group that is modified', () => {
				const oldCases = [buildOldLinkedCase('case-b', true), buildOldLinkedCase('case-c', false)];
				const newCases = [{ linkedCaseId: 'case-b', linkedCaseIsLead: 'no' }];

				const linkedCaseReferenceMap = [
					{ id: CASE_ID, reference: 'CASE-1' },
					{ id: 'case-b', reference: 'CASE-B' },
					{ id: 'case-c', reference: 'CASE-C' }
				];

				const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, linkedCaseReferenceMap, oldCases, newCases);

				assert.strictEqual(entries.length, 3);

				const updatedEntries = entries.filter((entry) => entry.action === AUDIT_ACTIONS.LINKED_CASE_GROUP_UPDATED);
				const deletedEntries = entries.filter((entry) => entry.action === AUDIT_ACTIONS.LINKED_CASE_GROUP_DELETED);

				assert.strictEqual(updatedEntries.length, 2);
				assert.strictEqual(deletedEntries.length, 1);
				assert.deepStrictEqual(updatedEntries.map((entry) => entry.caseId).sort(), [CASE_ID, 'case-b'].sort());
				assert.strictEqual(deletedEntries[0].caseId, 'case-c');

				for (const entry of updatedEntries) {
					assert.strictEqual(entry.metadata?.fieldName, 'linked cases');

					const oldMembers = entry.metadata?.oldLinkedCases as Array<{ reference: string; isLead: boolean }>;
					const newMembers = entry.metadata?.newLinkedCases as Array<{ reference: string; isLead: boolean }>;

					assert.strictEqual(oldMembers.filter((member) => member.isLead).length, 1);
					assert.strictEqual(newMembers.filter((member) => member.isLead).length, 1);

					assert.strictEqual(oldMembers.find((member) => member.isLead)?.reference, 'CASE-B');
					assert.strictEqual(newMembers.find((member) => member.isLead)?.reference, 'CASE-1');
				}
			});
		});

		describe('deletions', () => {
			it('should create a delete entry for a case removed from the group', () => {
				const oldCases = [buildOldLinkedCase('case-b', true), buildOldLinkedCase('case-c', false)];
				const newCases = [{ linkedCaseId: 'case-b', linkedCaseIsLead: 'yes' }];

				const linkedCaseReferenceMap = [
					{ id: CASE_ID, reference: 'CASE-1' },
					{ id: 'case-b', reference: 'CASE-B' },
					{ id: 'case-c', reference: 'CASE-C' }
				];

				const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, linkedCaseReferenceMap, oldCases, newCases);

				const deletedEntry = entries.find((entry) => entry.caseId === 'case-c');
				assert.ok(deletedEntry);
				assert.strictEqual(deletedEntry.action, AUDIT_ACTIONS.LINKED_CASE_GROUP_DELETED);

				const oldMembers = deletedEntry.metadata?.oldLinkedCases as Array<{ reference: string; isLead: boolean }>;
				assert.strictEqual(oldMembers.filter((member) => member.isLead).length, 1);
				assert.strictEqual(oldMembers.find((member) => member.isLead)?.reference, 'CASE-B');
			});

			it('should create a delete entry when the linked group is completely removed', () => {
				const oldCases = [buildOldLinkedCase('case-b', true)];
				const newCases: { linkedCaseId: string; linkedCaseIsLead: string }[] = [];

				const linkedCaseReferenceMap = [
					{ id: CASE_ID, reference: 'CASE-1' },
					{ id: 'case-b', reference: 'CASE-B' }
				];

				const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, linkedCaseReferenceMap, oldCases, newCases);

				assert.strictEqual(entries.length, 2);

				const deletedEntry = entries.find((entry) => entry.caseId === 'case-b');
				assert.ok(deletedEntry);
				assert.strictEqual(deletedEntry.action, AUDIT_ACTIONS.LINKED_CASE_GROUP_DELETED);

				const oldMembers = deletedEntry.metadata?.oldLinkedCases as Array<{ reference: string; isLead: boolean }>;
				assert.strictEqual(oldMembers.filter((member) => member.isLead).length, 1);
				assert.strictEqual(oldMembers.find((member) => member.isLead)?.reference, 'CASE-B');

				const selfDeletedEntry = entries.find((entry) => entry.caseId === CASE_ID);
				assert.ok(selfDeletedEntry);
				assert.strictEqual(selfDeletedEntry.action, AUDIT_ACTIONS.LINKED_CASE_GROUP_DELETED);

				const selfOldMembers = selfDeletedEntry.metadata?.oldLinkedCases as Array<{
					reference: string;
					isLead: boolean;
				}>;
				assert.strictEqual(selfOldMembers.filter((member) => member.isLead).length, 1);
				assert.strictEqual(selfOldMembers.find((member) => member.isLead)?.reference, 'CASE-B');
			});
		});

		describe('additions to an existing group', () => {
			it('should create an add entry for a new case and update entries for existing members', () => {
				const oldCases = [buildOldLinkedCase('case-b', true)];
				const newCases = [
					{ linkedCaseId: 'case-b', linkedCaseIsLead: 'yes' },
					{ linkedCaseId: 'case-d', linkedCaseIsLead: 'no' }
				];

				const linkedCaseReferenceMap = [
					{ id: CASE_ID, reference: 'CASE-1' },
					{ id: 'case-b', reference: 'CASE-B' },
					{ id: 'case-d', reference: 'CASE-D' }
				];

				const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, linkedCaseReferenceMap, oldCases, newCases);

				const addedEntries = entries.filter((entry) => entry.action === AUDIT_ACTIONS.LINKED_CASE_GROUP_ADDED);
				const updatedEntries = entries.filter((entry) => entry.action === AUDIT_ACTIONS.LINKED_CASE_GROUP_UPDATED);

				assert.strictEqual(addedEntries.length, 1);
				assert.strictEqual(addedEntries[0].caseId, 'case-d');

				const newMembersForAdded = addedEntries[0].metadata?.newLinkedCases as Array<{
					reference: string;
					isLead: boolean;
				}>;
				assert.strictEqual(newMembersForAdded.find((member) => member.isLead)?.reference, 'CASE-B');

				assert.strictEqual(updatedEntries.length, 2);
				assert.deepStrictEqual(updatedEntries.map((entry) => entry.caseId).sort(), [CASE_ID, 'case-b'].sort());

				for (const entry of updatedEntries) {
					const oldMembers = entry.metadata?.oldLinkedCases as Array<{ reference: string; isLead: boolean }>;
					const newMembers = entry.metadata?.newLinkedCases as Array<{ reference: string; isLead: boolean }>;

					assert.strictEqual(oldMembers.find((member) => member.isLead)?.reference, 'CASE-B');
					assert.strictEqual(newMembers.find((member) => member.isLead)?.reference, 'CASE-B');
				}
			});
		});

		describe('merging two existing groups', () => {
			it('should create update entries (not add entries) for every case when the edited case designates another established lead - preserving both groups children', () => {
				// Before this edit there are two established groups:
				//   [case-lead (lead), case-2, case-3]
				//   [CASE_ID (lead), case-y]
				// Editing CASE_ID to designate case-lead as the new lead merges both groups
				// into one: [case-lead (lead), case-2, case-3, CASE_ID, case-y]. Every member
				// of both original groups should be reported as UPDATED, not ADDED - none
				// of them are genuinely new, they're just now in a combined group.
				const oldCases = [buildOldLinkedCase('case-y', false)];
				// This mirrors what update-case.ts now builds from applyLinkedCaseRelationships's
				// FinalLinkedCaseGroup: the true final group, including case-lead's pre-existing
				// children (case-2/case-3) which were never explicitly submitted by the user.
				const newCases = [
					{ linkedCaseId: 'case-lead', linkedCaseIsLead: 'yes' },
					{ linkedCaseId: 'case-y', linkedCaseIsLead: 'no' },
					{ linkedCaseId: 'case-2', linkedCaseIsLead: 'no' },
					{ linkedCaseId: 'case-3', linkedCaseIsLead: 'no' }
				];
				const mergedLeadOldGroup = {
					leadCaseId: 'case-lead',
					members: [buildOldLinkedCase('case-2', false), buildOldLinkedCase('case-3', false)]
				};

				const linkedCaseReferenceMap = [
					{ id: CASE_ID, reference: 'CASE-X' },
					{ id: 'case-y', reference: 'CASE-Y' },
					{ id: 'case-lead', reference: 'CASE-1' },
					{ id: 'case-2', reference: 'CASE-2' },
					{ id: 'case-3', reference: 'CASE-3' }
				];

				const entries = resolveLinkedCaseAudits(
					CASE_ID,
					USER_ID,
					linkedCaseReferenceMap,
					oldCases,
					newCases,
					mergedLeadOldGroup
				);

				assert.strictEqual(entries.length, 5);
				assert.ok(entries.every((entry) => entry.action === AUDIT_ACTIONS.LINKED_CASE_GROUP_UPDATED));
				assert.deepStrictEqual(
					entries.map((entry) => entry.caseId).sort(),
					[CASE_ID, 'case-y', 'case-lead', 'case-2', 'case-3'].sort()
				);

				const finalGroupReferences = ['CASE-1', 'CASE-2', 'CASE-3', 'CASE-X', 'CASE-Y'].sort();

				for (const entry of entries) {
					assert.strictEqual(entry.metadata?.fieldName, 'linked cases');

					const newMembers = entry.metadata?.newLinkedCases as Array<{ reference: string; isLead: boolean }>;
					assert.deepStrictEqual(newMembers.map((member) => member.reference).sort(), finalGroupReferences);
					assert.strictEqual(newMembers.find((member) => member.isLead)?.reference, 'CASE-1');
				}

				// case-lead/case-2/case-3 were never part of CASE_ID's own old group, so their
				// `oldLinkedCases` must come from case-lead's real prior group, not CASE_ID's.
				const mergedInEntries = entries.filter((entry) => ['case-lead', 'case-2', 'case-3'].includes(entry.caseId));
				assert.strictEqual(mergedInEntries.length, 3);

				for (const entry of mergedInEntries) {
					const oldMembers = entry.metadata?.oldLinkedCases as Array<{ reference: string; isLead: boolean }>;
					assert.deepStrictEqual(
						oldMembers.map((member) => member.reference).sort(),
						['CASE-1', 'CASE-2', 'CASE-3'].sort()
					);
					assert.strictEqual(oldMembers.find((member) => member.isLead)?.reference, 'CASE-1');
				}

				// CASE_ID/case-y were already in CASE_ID's own old group.
				const primaryEntries = entries.filter((entry) => [CASE_ID, 'case-y'].includes(entry.caseId));
				assert.strictEqual(primaryEntries.length, 2);

				for (const entry of primaryEntries) {
					const oldMembers = entry.metadata?.oldLinkedCases as Array<{ reference: string; isLead: boolean }>;
					assert.deepStrictEqual(oldMembers.map((member) => member.reference).sort(), ['CASE-X', 'CASE-Y'].sort());
					assert.strictEqual(oldMembers.find((member) => member.isLead)?.reference, 'CASE-X');
				}
			});

			it('should create an add entry (not update) for a case that was not previously linked to anything, when it joins an established group', () => {
				// CASE_ID was standalone before this edit (no oldCases at all) - it is
				// genuinely new to linked cases, even though it's joining an established
				// lead's group. It must be ADDED, not UPDATED (a size-1 "old group" made
				// up of just CASE_ID itself is not a real prior group).
				const oldCases: LinkedCaseAuditSource[] = [];
				const newCases = [
					{ linkedCaseId: 'case-lead', linkedCaseIsLead: 'yes' },
					{ linkedCaseId: 'case-2', linkedCaseIsLead: 'no' },
					{ linkedCaseId: 'case-3', linkedCaseIsLead: 'no' }
				];
				const mergedLeadOldGroup = {
					leadCaseId: 'case-lead',
					members: [buildOldLinkedCase('case-2', false), buildOldLinkedCase('case-3', false)]
				};

				const linkedCaseReferenceMap = [
					{ id: CASE_ID, reference: 'CASE-SOLO' },
					{ id: 'case-lead', reference: 'CASE-1' },
					{ id: 'case-2', reference: 'CASE-2' },
					{ id: 'case-3', reference: 'CASE-3' }
				];

				const entries = resolveLinkedCaseAudits(
					CASE_ID,
					USER_ID,
					linkedCaseReferenceMap,
					oldCases,
					newCases,
					mergedLeadOldGroup
				);

				assert.strictEqual(entries.length, 4);

				const solosEntry = entries.find((entry) => entry.caseId === CASE_ID);
				assert.ok(solosEntry);
				assert.strictEqual(solosEntry.action, AUDIT_ACTIONS.LINKED_CASE_GROUP_ADDED);
				assert.strictEqual(solosEntry.metadata?.oldLinkedCases, undefined);

				const mergedInEntries = entries.filter((entry) => ['case-lead', 'case-2', 'case-3'].includes(entry.caseId));
				assert.strictEqual(mergedInEntries.length, 3);
				assert.ok(mergedInEntries.every((entry) => entry.action === AUDIT_ACTIONS.LINKED_CASE_GROUP_UPDATED));

				for (const entry of mergedInEntries) {
					const oldMembers = entry.metadata?.oldLinkedCases as Array<{ reference: string; isLead: boolean }>;
					assert.deepStrictEqual(
						oldMembers.map((member) => member.reference).sort(),
						['CASE-1', 'CASE-2', 'CASE-3'].sort()
					);
					assert.strictEqual(oldMembers.find((member) => member.isLead)?.reference, 'CASE-1');
				}
			});
		});

		describe('no changes', () => {
			it('should return no entries when the linked group is unchanged', () => {
				const oldCases = [buildOldLinkedCase('case-b', true), buildOldLinkedCase('case-c', false)];
				const newCases = [
					{ linkedCaseId: 'case-b', linkedCaseIsLead: 'yes' },
					{ linkedCaseId: 'case-c', linkedCaseIsLead: 'no' }
				];

				const linkedCaseReferenceMap = [
					{ id: CASE_ID, reference: 'CASE-1' },
					{ id: 'case-b', reference: 'CASE-B' },
					{ id: 'case-c', reference: 'CASE-C' }
				];

				const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, linkedCaseReferenceMap, oldCases, newCases);

				assert.strictEqual(entries.length, 0);
			});

			it('should return no entries when both groups are empty', () => {
				const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, [], [], []);

				assert.strictEqual(entries.length, 0);
			});

			it('should return no entries when the linked group is unchanged but submitted in a different order', () => {
				// oldCases here mimics DB fetch order; newCases mimics a differently-ordered
				// rebuilt/submitted list for the same membership - a pure reordering with no
				// actual membership or isLead change should not produce audit entries.
				const oldCases = [
					buildOldLinkedCase('case-b', true),
					buildOldLinkedCase('case-c', false),
					buildOldLinkedCase('case-d', false)
				];
				const newCases = [
					{ linkedCaseId: 'case-d', linkedCaseIsLead: 'no' },
					{ linkedCaseId: 'case-b', linkedCaseIsLead: 'yes' },
					{ linkedCaseId: 'case-c', linkedCaseIsLead: 'no' }
				];

				const linkedCaseReferenceMap = [
					{ id: CASE_ID, reference: 'CASE-1' },
					{ id: 'case-b', reference: 'CASE-B' },
					{ id: 'case-c', reference: 'CASE-C' },
					{ id: 'case-d', reference: 'CASE-D' }
				];

				const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, linkedCaseReferenceMap, oldCases, newCases);

				assert.strictEqual(entries.length, 0);
			});
		});
	});
});
