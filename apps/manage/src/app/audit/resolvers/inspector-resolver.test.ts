import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveInspectorAudits, type InspectorWithUser } from './inspector-resolver.ts';
import { AUDIT_ACTIONS } from '../actions.ts';

/**
 * Helper to build a mock InspectorWithUser matching the Prisma shape.
 */
function buildOldInspector(idpUserId: string, allocatedDate: string | null): InspectorWithUser {
	return {
		id: `inspector-record-${idpUserId}`,
		caseId: 'case-1',
		inspectorId: `user-record-${idpUserId}`,
		inspectorAllocatedDate: allocatedDate ? new Date(allocatedDate) : null,
		createdDate: new Date(),
		Inspector: {
			id: `user-record-${idpUserId}`,
			idpUserId,
			legacyId: null
		}
	} as InspectorWithUser;
}

const CASE_ID = 'case-1';
const USER_ID = 'user-performing-action';

const userDisplayNameMap = new Map([
	['entra-1', 'John Doe'],
	['entra-2', 'Jane Smith'],
	['entra-3', 'Tom Cruise']
]);

describe('resolveInspectorAudits', () => {
	describe('additions', () => {
		it('should detect a new inspector being added', () => {
			const oldInspectors: InspectorWithUser[] = [];
			const newInspectors = [{ inspectorId: 'entra-1', inspectorAllocatedDate: '2026-01-01' }];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.INSPECTOR_ADDED);
			assert.strictEqual(entries[0].metadata?.name, 'John Doe');
		});

		it('should detect multiple inspectors being added', () => {
			const oldInspectors: InspectorWithUser[] = [];
			const newInspectors = [
				{ inspectorId: 'entra-1', inspectorAllocatedDate: '2026-01-01' },
				{ inspectorId: 'entra-2', inspectorAllocatedDate: '2026-02-01' }
			];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			assert.strictEqual(entries.length, 2);
			assert.ok(entries.every((e) => e.action === AUDIT_ACTIONS.INSPECTOR_ADDED));
			assert.strictEqual(entries[0].metadata?.name, 'John Doe');
			assert.strictEqual(entries[1].metadata?.name, 'Jane Smith');
		});

		it('should fall back to raw Entra ID if not in display name map', () => {
			const oldInspectors: InspectorWithUser[] = [];
			const newInspectors = [{ inspectorId: 'unknown-entra-id', inspectorAllocatedDate: '2026-01-01' }];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].metadata?.name, 'unknown-entra-id');
		});
	});

	describe('deletions', () => {
		it('should detect an inspector being removed', () => {
			const oldInspectors = [buildOldInspector('entra-1', '2026-01-01')];
			const newInspectors: { inspectorId: string; inspectorAllocatedDate: string }[] = [];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.INSPECTOR_DELETED);
			assert.strictEqual(entries[0].metadata?.name, 'John Doe');
		});

		it('should detect the correct inspector removed from the middle of a list', () => {
			const oldInspectors = [
				buildOldInspector('entra-1', '2026-01-01'),
				buildOldInspector('entra-2', '2026-02-01'),
				buildOldInspector('entra-3', '2026-03-01')
			];
			const newInspectors = [
				{ inspectorId: 'entra-1', inspectorAllocatedDate: '2026-01-01' },
				{ inspectorId: 'entra-3', inspectorAllocatedDate: '2026-03-01' }
			];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.INSPECTOR_DELETED);
			assert.strictEqual(entries[0].metadata?.name, 'Jane Smith');
		});
	});

	describe('updates', () => {
		it('should detect a date appointed change', () => {
			const oldInspectors = [buildOldInspector('entra-1', '2025-01-10')];
			const newInspectors = [{ inspectorId: 'entra-1', inspectorAllocatedDate: '2025-10-10' }];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.INSPECTOR_UPDATED);
			assert.strictEqual(entries[0].metadata?.entityName, 'John Doe');
			assert.strictEqual(entries[0].metadata?.fieldName, 'date appointed');
			assert.strictEqual(entries[0].metadata?.oldValue, '10 January 2025');
			assert.strictEqual(entries[0].metadata?.newValue, '10 October 2025');
		});

		it('should not produce an entry when date has not changed', () => {
			const oldInspectors = [buildOldInspector('entra-1', '2025-01-10')];
			const newInspectors = [{ inspectorId: 'entra-1', inspectorAllocatedDate: '2025-01-10' }];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('combined operations', () => {
		it('should detect an add and a delete when one inspector is swapped for another', () => {
			const oldInspectors = [buildOldInspector('entra-1', '2026-01-01')];
			const newInspectors = [{ inspectorId: 'entra-2', inspectorAllocatedDate: '2026-01-01' }];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			const added = entries.filter((e) => e.action === AUDIT_ACTIONS.INSPECTOR_ADDED);
			const deleted = entries.filter((e) => e.action === AUDIT_ACTIONS.INSPECTOR_DELETED);

			assert.strictEqual(added.length, 1);
			assert.strictEqual(added[0].metadata?.name, 'Jane Smith');
			assert.strictEqual(deleted.length, 1);
			assert.strictEqual(deleted[0].metadata?.name, 'John Doe');
		});

		it('should detect add, delete, and update in a single diff', () => {
			const oldInspectors = [buildOldInspector('entra-1', '2025-01-01'), buildOldInspector('entra-2', '2025-02-01')];
			const newInspectors = [
				{ inspectorId: 'entra-1', inspectorAllocatedDate: '2025-06-01' },
				{ inspectorId: 'entra-3', inspectorAllocatedDate: '2025-03-01' }
			];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			const added = entries.filter((e) => e.action === AUDIT_ACTIONS.INSPECTOR_ADDED);
			const deleted = entries.filter((e) => e.action === AUDIT_ACTIONS.INSPECTOR_DELETED);
			const updated = entries.filter((e) => e.action === AUDIT_ACTIONS.INSPECTOR_UPDATED);

			assert.strictEqual(added.length, 1);
			assert.strictEqual(added[0].metadata?.name, 'Tom Cruise');

			assert.strictEqual(deleted.length, 1);
			assert.strictEqual(deleted[0].metadata?.name, 'Jane Smith');

			assert.strictEqual(updated.length, 1);
			assert.strictEqual(updated[0].metadata?.entityName, 'John Doe');
			assert.strictEqual(updated[0].metadata?.oldValue, '1 January 2025');
			assert.strictEqual(updated[0].metadata?.newValue, '1 June 2025');
		});
	});

	describe('no changes', () => {
		it('should return no entries when lists are identical', () => {
			const oldInspectors = [buildOldInspector('entra-1', '2025-01-10'), buildOldInspector('entra-2', '2025-02-15')];
			const newInspectors = [
				{ inspectorId: 'entra-1', inspectorAllocatedDate: '2025-01-10' },
				{ inspectorId: 'entra-2', inspectorAllocatedDate: '2025-02-15' }
			];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			assert.strictEqual(entries.length, 0);
		});

		it('should return no entries when both lists are empty', () => {
			const entries = resolveInspectorAudits(CASE_ID, USER_ID, [], [], userDisplayNameMap);

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('metadata', () => {
		it('should include caseId and userId on all entries', () => {
			const oldInspectors: InspectorWithUser[] = [];
			const newInspectors = [{ inspectorId: 'entra-1', inspectorAllocatedDate: '2026-01-01' }];

			const entries = resolveInspectorAudits(CASE_ID, USER_ID, oldInspectors, newInspectors, userDisplayNameMap);

			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].userId, USER_ID);
		});
	});
});
