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

function buildOldLinkedCase(id: string, reference: string, isLead: boolean): LinkedCaseAuditSource {
	return { id, reference, isLead };
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
	describe('additions', () => {
		it('should detect a new linked case without an ID as added', () => {
			const oldCases: LinkedCaseAuditSource[] = [];
			const newCases = [{ linkedCaseId: '123456', linkedCaseIsLead: 'yes' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 2);

			// Check entry for current case
			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.LINKED_CASE_ADDED);
			assert.strictEqual(entries[0].metadata?.reference, '123456');
			assert.strictEqual(entries[0].metadata?.linkedCaseId, '123456');

			// Check entry for linked case
			assert.strictEqual(entries[1].caseId, '123456');
			assert.strictEqual(entries[1].action, AUDIT_ACTIONS.LINKED_CASE_ADDED);
			assert.strictEqual(entries[1].metadata?.reference, CASE_ID);
			assert.strictEqual(entries[1].metadata?.linkedCaseId, CASE_ID);
		});

		it('should create audit entries on both cases when a new linked case is added', () => {
			const oldCases = [buildOldLinkedCase('id-1', 'existing', true)];
			const newCases = [
				{ id: 'id-1', linkedCaseId: 'existing', linkedCaseIsLead: 'yes' },
				{ id: 'id-new', linkedCaseId: 'new-ref', linkedCaseIsLead: 'no' }
			];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 2);

			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.LINKED_CASE_ADDED);
			assert.strictEqual(entries[0].metadata?.reference, 'new-ref');
			assert.strictEqual(entries[0].metadata?.linkedCaseId, 'new-ref');

			assert.strictEqual(entries[1].caseId, 'new-ref');
			assert.strictEqual(entries[1].action, AUDIT_ACTIONS.LINKED_CASE_ADDED);
			assert.strictEqual(entries[1].metadata?.reference, CASE_ID);
			assert.strictEqual(entries[1].metadata?.linkedCaseId, CASE_ID);
		});
	});

	describe('deletions', () => {
		it('should detect a linked case being removed', () => {
			const oldCases = [buildOldLinkedCase('id-1', '123456', true)];
			const newCases: { id?: string; linkedCaseId: string; linkedCaseIsLead: string }[] = [];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 2);

			// Check entry for current case
			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.LINKED_CASE_DELETED);
			assert.strictEqual(entries[0].metadata?.reference, '123456');

			// Check entry for linked case
			assert.strictEqual(entries[1].caseId, '123456');
			assert.strictEqual(entries[1].action, AUDIT_ACTIONS.LINKED_CASE_DELETED);
			assert.strictEqual(entries[1].metadata?.reference, CASE_ID);
		});

		it('should create audit entries on both cases when a linked case is removed', () => {
			const oldCases = [
				buildOldLinkedCase('id-1', 'first', true),
				buildOldLinkedCase('id-2', 'second', false),
				buildOldLinkedCase('id-3', 'third', false)
			];
			const newCases = [
				{ id: 'id-1', linkedCaseId: 'first', linkedCaseIsLead: 'yes' },
				{ id: 'id-3', linkedCaseId: 'third', linkedCaseIsLead: 'no' }
			];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 2);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.LINKED_CASE_DELETED);
			assert.strictEqual(entries[0].metadata?.reference, 'second');
		});
	});

	describe('updates — reference change', () => {
		it('should create audit entries on both cases when a linked case reference is updated', () => {
			const oldCases = [buildOldLinkedCase('id-1', '123456', true)];
			const newCases = [{ id: 'id-1', linkedCaseId: '78910', linkedCaseIsLead: 'yes' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 3);

			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.LINKED_CASE_UPDATED);
			assert.strictEqual(entries[0].metadata?.entityName, '123456');
			assert.strictEqual(entries[0].metadata?.fieldName, 'linked case reference');
			assert.strictEqual(entries[0].metadata?.oldValue, '123456');
			assert.strictEqual(entries[0].metadata?.newValue, '78910');
			assert.strictEqual(entries[0].metadata?.linkedCaseId, '78910');

			assert.strictEqual(entries[1].caseId, '123456');
			assert.strictEqual(entries[1].action, AUDIT_ACTIONS.LINKED_CASE_DELETED);
			assert.strictEqual(entries[1].metadata?.reference, CASE_ID);
			assert.strictEqual(entries[1].metadata?.linkedCaseId, CASE_ID);

			assert.strictEqual(entries[2].caseId, '78910');
			assert.strictEqual(entries[2].action, AUDIT_ACTIONS.LINKED_CASE_ADDED);
			assert.strictEqual(entries[2].metadata?.reference, CASE_ID);
			assert.strictEqual(entries[2].metadata?.linkedCaseId, CASE_ID);
		});
	});

	describe('updates — isLead change', () => {
		it('should detect isLead changing from Yes to No', () => {
			const oldCases = [buildOldLinkedCase('id-1', '123456', true)];
			const newCases = [{ id: 'id-1', linkedCaseId: '123456', linkedCaseIsLead: 'no' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 2);

			// Check entry for current case
			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.LINKED_CASE_UPDATED);
			assert.strictEqual(entries[0].metadata?.entityName, '123456');
			assert.strictEqual(entries[0].metadata?.fieldName, 'lead?');
			assert.strictEqual(entries[0].metadata?.oldValue, 'Yes');
			assert.strictEqual(entries[0].metadata?.newValue, 'No');

			// Check entry for linked case
			assert.strictEqual(entries[1].caseId, '123456');
			assert.strictEqual(entries[1].metadata?.entityName, CASE_ID);
			assert.strictEqual(entries[1].metadata?.oldValue, 'No');
			assert.strictEqual(entries[1].metadata?.newValue, 'Yes');
		});

		it('should detect isLead changing from No to Yes', () => {
			const oldCases = [buildOldLinkedCase('id-1', '123456', false)];
			const newCases = [{ id: 'id-1', linkedCaseId: '123456', linkedCaseIsLead: 'yes' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 2);
			assert.strictEqual(entries[0].metadata?.oldValue, 'No');
			assert.strictEqual(entries[0].metadata?.newValue, 'Yes');
		});

		it('should not produce an entry when isLead has not changed', () => {
			const oldCases = [buildOldLinkedCase('id-1', '123456', true)];
			const newCases = [{ id: 'id-1', linkedCaseId: '123456', linkedCaseIsLead: 'yes' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('updates — both reference and isLead change', () => {
		it('should produce two entries when both reference and isLead change', () => {
			const oldCases = [buildOldLinkedCase('id-1', '123456', true)];
			const newCases = [{ id: 'id-1', linkedCaseId: '78910', linkedCaseIsLead: 'no' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 5);

			const refChange = entries.find((e) => e.metadata?.fieldName === 'linked case reference');
			const leadChange = entries.find((e) => e.metadata?.fieldName === 'lead?');

			assert.ok(refChange);
			assert.strictEqual(refChange?.metadata?.oldValue, '123456');
			assert.strictEqual(refChange?.metadata?.newValue, '78910');

			assert.ok(leadChange);
			assert.strictEqual(leadChange?.metadata?.oldValue, 'Yes');
			assert.strictEqual(leadChange?.metadata?.newValue, 'No');
		});
	});

	describe('combined operations', () => {
		it('should detect add, delete, and update in a single diff', () => {
			const oldCases = [buildOldLinkedCase('id-1', 'first', true), buildOldLinkedCase('id-2', 'second', false)];
			const newCases = [
				{ id: 'id-1', linkedCaseId: 'first', linkedCaseIsLead: 'no' },
				{ linkedCaseId: 'third', linkedCaseIsLead: 'yes' }
			];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			const added = entries.filter((e) => e.action === AUDIT_ACTIONS.LINKED_CASE_ADDED);
			const deleted = entries.filter((e) => e.action === AUDIT_ACTIONS.LINKED_CASE_DELETED);
			const updated = entries.filter((e) => e.action === AUDIT_ACTIONS.LINKED_CASE_UPDATED);

			assert.strictEqual(added.length, 2); // bidirectional
			assert.ok(added.some((e) => e.caseId === CASE_ID && e.metadata?.reference === 'third'));
			assert.ok(added.some((e) => e.caseId === 'third' && e.metadata?.reference === CASE_ID));

			assert.strictEqual(deleted.length, 2); // bidirectional
			assert.ok(deleted.some((e) => e.caseId === CASE_ID && e.metadata?.reference === 'second'));
			assert.ok(deleted.some((e) => e.caseId === 'second' && e.metadata?.reference === CASE_ID));

			assert.strictEqual(updated.length, 2); // bidirectional
			assert.ok(updated.every((e) => e.metadata?.fieldName === 'lead?'));
		});
	});

	describe('no changes', () => {
		it('should return no entries when lists are identical', () => {
			const oldCases = [buildOldLinkedCase('id-1', '123456', true)];
			const newCases = [{ id: 'id-1', linkedCaseId: '123456', linkedCaseIsLead: 'yes' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			assert.strictEqual(entries.length, 0);
		});

		it('should return no entries when both lists are empty', () => {
			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, [], []);

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('metadata', () => {
		it('should include caseId and userId on all entries', () => {
			const oldCases: LinkedCaseAuditSource[] = [];
			const newCases = [{ linkedCaseId: '123', linkedCaseIsLead: 'yes' }];

			const entries = resolveLinkedCaseAudits(CASE_ID, USER_ID, oldCases, newCases);

			// Both entries should have caseId and userId
			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].userId, USER_ID);
			assert.strictEqual(entries[1].caseId, '123');
			assert.strictEqual(entries[1].userId, USER_ID);
		});
	});
});
