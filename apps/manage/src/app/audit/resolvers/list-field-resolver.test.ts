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
	describe('group snapshots', () => {
		it('should create update entries for every case in the final linked group', () => {
			const oldCases = [buildOldLinkedCase('case-b', true)];
			const newCases = [
				{ linkedCaseId: 'case-b', linkedCaseIsLead: 'yes' },
				{ linkedCaseId: 'case-c', linkedCaseIsLead: 'no' }
			];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 3);

			assert.deepStrictEqual(entries.map((entry) => entry.caseId).sort(), [CASE_ID, 'case-b', 'case-c'].sort());

			for (const entry of entries) {
				assert.strictEqual(entry.action, AUDIT_ACTIONS.LINKED_CASE_UPDATED);
				assert.strictEqual(entry.metadata?.fieldName, 'linked cases');
				assert.deepStrictEqual(entry.metadata?.oldLinkedCases, [
					{ caseId: CASE_ID, isLead: false },
					{ caseId: 'case-b', isLead: true }
				]);
				assert.deepStrictEqual(entry.metadata?.newLinkedCases, [
					{ caseId: CASE_ID, isLead: false },
					{ caseId: 'case-b', isLead: true },
					{ caseId: 'case-c', isLead: false }
				]);
			}
		});

		it('should mark the current case as lead when the old group has no lead case', () => {
			const oldCases = [buildOldLinkedCase('case-b', false), buildOldLinkedCase('case-c', false)];
			const newCases = [
				{ linkedCaseId: 'case-b', linkedCaseIsLead: 'no' },
				{ linkedCaseId: 'case-c', linkedCaseIsLead: 'no' }
			];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 3);

			const currentCaseEntry = entries.find((entry) => entry.caseId === CASE_ID);
			assert.ok(currentCaseEntry);
			assert.deepStrictEqual(currentCaseEntry?.metadata?.oldLinkedCases, [
				{ caseId: CASE_ID, isLead: true },
				{ caseId: 'case-b', isLead: false },
				{ caseId: 'case-c', isLead: false }
			]);
			assert.deepStrictEqual(currentCaseEntry?.metadata?.newLinkedCases, [
				{ caseId: CASE_ID, isLead: true },
				{ caseId: 'case-b', isLead: false },
				{ caseId: 'case-c', isLead: false }
			]);
		});
	});

	describe('removals', () => {
		it('should create deletion entries for cases removed from the group', () => {
			const oldCases = [buildOldLinkedCase('case-b', true), buildOldLinkedCase('case-c', false)];
			const newCases = [{ linkedCaseId: 'case-b', linkedCaseIsLead: 'yes' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 3);

			const deletedEntry = entries.find((entry) => entry.caseId === 'case-c');
			assert.ok(deletedEntry);
			assert.strictEqual(deletedEntry.action, AUDIT_ACTIONS.LINKED_CASE_DELETED);
			assert.deepStrictEqual(deletedEntry.metadata, {
				fieldName: 'linked cases'
			});

			const updatedEntries = entries.filter((entry) => entry.action === AUDIT_ACTIONS.LINKED_CASE_UPDATED);
			assert.strictEqual(updatedEntries.length, 2);
			assert.deepStrictEqual(updatedEntries.map((entry) => entry.caseId).sort(), [CASE_ID, 'case-b'].sort());
		});

		it('should create deletion entries when the final group collapses to one case', () => {
			const oldCases = [buildOldLinkedCase('case-b', true)];
			const newCases: { linkedCaseId: string; linkedCaseIsLead: string }[] = [];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 2);
			assert.ok(
				entries.some((entry) => entry.caseId === 'case-b' && entry.action === AUDIT_ACTIONS.LINKED_CASE_DELETED)
			);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.LINKED_CASE_DELETED);
			assert.deepStrictEqual(entries[0].metadata, {
				fieldName: 'linked cases'
			});
		});
	});

	describe('no changes', () => {
		it('should return update entries when the linked group still contains more than one case', () => {
			const oldCases = [buildOldLinkedCase('case-b', true)];
			const newCases = [{ linkedCaseId: 'case-b', linkedCaseIsLead: 'yes' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 2);
			assert.deepStrictEqual(entries.map((entry) => entry.caseId).sort(), [CASE_ID, 'case-b'].sort());
			assert.ok(entries.every((entry) => entry.action === AUDIT_ACTIONS.LINKED_CASE_UPDATED));
		});

		it('should create a deletion entry for the current case when both groups are empty', () => {
			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, [], []);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.LINKED_CASE_DELETED);
			assert.deepStrictEqual(entries[0].metadata, {
				fieldName: 'linked cases'
			});
		});
	});
});
