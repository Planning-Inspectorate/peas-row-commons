import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveOutcomeAudits, type DecisionWithRelations } from './outcome-resolver.ts';
import { AUDIT_ACTIONS } from '../actions.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-performing-action';

const userDisplayNameMap = new Map([
	['entra-1', 'Charlotte Morphet'],
	['entra-2', 'Sophie Coates']
]);

function buildOldDecision(overrides: Partial<Record<string, unknown>> = {}): DecisionWithRelations {
	return {
		id: 'dec-1',
		caseOutcomeId: 'outcome-1',
		decisionTypeId: 'proposal',
		decisionMakerTypeId: null,
		outcomeId: null,
		outcomeDate: null,
		decisionReceivedDate: null,
		grantedWithConditionsComment: null,
		otherComment: null,
		DecisionType: { id: 'proposal', displayName: 'Proposal' },
		DecisionMakerType: null,
		DecisionMaker: null,
		Outcome: null,
		...overrides
	} as unknown as DecisionWithRelations;
}

describe('resolveOutcomeAudits', () => {
	describe('additions', () => {
		it('should detect a new outcome being added', () => {
			const oldDecisions: DecisionWithRelations[] = [];
			const newDecisions = [{ id: 'dec-new', decisionTypeId: 'proposal' }];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.OUTCOME_ADDED);
			assert.strictEqual(entries[0].metadata?.outcomeName, 'Proposal');
		});
	});

	describe('deletions', () => {
		it('should detect an outcome being removed', () => {
			const oldDecisions = [buildOldDecision()];
			const newDecisions: Record<string, unknown>[] = [];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.OUTCOME_DELETED);
			assert.strictEqual(entries[0].metadata?.outcomeName, 'Proposal');
		});
	});

	describe('updates — type', () => {
		it('should detect a decision type change', () => {
			const oldDecisions = [buildOldDecision()];
			const newDecisions = [{ id: 'dec-1', decisionTypeId: 'decision' }];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			const typeEntry = entries.find((e) => e.metadata?.fieldName === 'type');

			assert.ok(typeEntry);
			assert.strictEqual(typeEntry?.metadata?.outcomeName, 'Proposal');
			assert.strictEqual(typeEntry?.metadata?.oldValue, 'Proposal');
		});
	});

	describe('updates — originator', () => {
		it('should detect an originator change', () => {
			const oldDecisions = [
				buildOldDecision({
					decisionMakerTypeId: 'officer',
					DecisionMakerType: { id: 'officer', displayName: 'Officer' },
					DecisionMaker: { idpUserId: 'entra-1' }
				})
			];
			const newDecisions = [
				{
					id: 'dec-1',
					decisionTypeId: 'proposal',
					decisionMakerTypeId: 'inspector',
					decisionMakerInspectorId: 'entra-2'
				}
			];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			const originatorEntry = entries.find((e) => e.metadata?.fieldName === 'originator');

			assert.ok(originatorEntry);
			assert.strictEqual(originatorEntry?.metadata?.oldValue, 'Officer Charlotte Morphet');
			assert.strictEqual(originatorEntry?.metadata?.newValue, 'Inspector Sophie Coates');
		});

		it('should handle originator with no user (e.g. Secretary of State)', () => {
			const oldDecisions = [
				buildOldDecision({
					decisionMakerTypeId: 'secretary-of-state',
					DecisionMakerType: { id: 'secretary-of-state', displayName: 'Secretary of State' },
					DecisionMaker: null
				})
			];
			const newDecisions = [
				{
					id: 'dec-1',
					decisionTypeId: 'proposal',
					decisionMakerTypeId: 'officer',
					decisionMakerOfficerId: 'entra-1'
				}
			];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			const originatorEntry = entries.find((e) => e.metadata?.fieldName === 'originator');

			assert.ok(originatorEntry);
			assert.strictEqual(originatorEntry?.metadata?.oldValue, 'Secretary of State');
			assert.strictEqual(originatorEntry?.metadata?.newValue, 'Officer Charlotte Morphet');
		});
	});

	describe('updates — outcome', () => {
		it('should detect an outcome selection change', () => {
			const oldDecisions = [
				buildOldDecision({
					outcomeId: 'allow',
					Outcome: { id: 'allow', displayName: 'Allow' }
				})
			];
			const newDecisions = [
				{
					id: 'dec-1',
					decisionTypeId: 'proposal',
					outcomeId: 'dismissed'
				}
			];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			const outcomeEntry = entries.find((e) => e.metadata?.fieldName === 'outcome');

			assert.ok(outcomeEntry);
			assert.strictEqual(outcomeEntry?.metadata?.oldValue, 'Allow');
		});

		it('should include conditions comment in outcome display', () => {
			const oldDecisions = [
				buildOldDecision({
					outcomeId: 'allow',
					Outcome: { id: 'allow', displayName: 'Allow' }
				})
			];
			const newDecisions = [
				{
					id: 'dec-1',
					decisionTypeId: 'proposal',
					outcomeId: 'granted-with-conditions',
					grantedWithConditionsComment: 'XYZ must change'
				}
			];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			const outcomeEntry = entries.find((e) => e.metadata?.fieldName === 'outcome');

			assert.ok(outcomeEntry);
			assert.strictEqual(outcomeEntry?.metadata?.oldValue, 'Allow');
			assert.ok(outcomeEntry?.metadata?.newValue?.toString().includes('XYZ must change'));
		});
	});

	describe('updates — outcome date', () => {
		it('should detect an outcome date change', () => {
			const oldDecisions = [buildOldDecision({ outcomeDate: new Date('2026-10-10') })];
			const newDecisions = [
				{
					id: 'dec-1',
					decisionTypeId: 'proposal',
					outcomeDate: '2026-10-11'
				}
			];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			const dateEntry = entries.find((e) => e.metadata?.fieldName === 'outcome date');

			assert.ok(dateEntry);
			assert.strictEqual(dateEntry?.metadata?.oldValue, '10 October 2026');
			assert.strictEqual(dateEntry?.metadata?.newValue, '11 October 2026');
		});
	});

	describe('updates — received date', () => {
		it('should detect a received date being set from null', () => {
			const oldDecisions = [buildOldDecision({ decisionReceivedDate: null })];
			const newDecisions = [
				{
					id: 'dec-1',
					decisionTypeId: 'proposal',
					decisionReceivedDate: '2026-10-11'
				}
			];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			const dateEntry = entries.find((e) => e.metadata?.fieldName === 'received date');

			assert.ok(dateEntry);
			assert.strictEqual(dateEntry?.metadata?.oldValue, '-');
			assert.strictEqual(dateEntry?.metadata?.newValue, '11 October 2026');
		});
	});

	describe('no changes', () => {
		it('should return no entries when outcome has not changed', () => {
			const oldDecisions = [buildOldDecision()];
			const newDecisions = [{ id: 'dec-1', decisionTypeId: 'proposal' }];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			assert.strictEqual(entries.length, 0);
		});

		it('should return no entries when both lists are empty', () => {
			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, [], [], userDisplayNameMap);

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('combined operations', () => {
		it('should detect add and delete in a single diff', () => {
			const oldDecisions = [buildOldDecision()];
			const newDecisions = [{ id: 'dec-new', decisionTypeId: 'decision' }];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			const added = entries.filter((e) => e.action === AUDIT_ACTIONS.OUTCOME_ADDED);
			const deleted = entries.filter((e) => e.action === AUDIT_ACTIONS.OUTCOME_DELETED);

			assert.strictEqual(added.length, 1);
			assert.strictEqual(deleted.length, 1);
		});
	});

	describe('metadata', () => {
		it('should include caseId and userId on all entries', () => {
			const oldDecisions: DecisionWithRelations[] = [];
			const newDecisions = [{ id: 'dec-new', decisionTypeId: 'proposal' }];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].userId, USER_ID);
		});

		it('should use old decision type as outcomeName context for updates', () => {
			const oldDecisions = [buildOldDecision()];
			const newDecisions = [{ id: 'dec-1', decisionTypeId: 'decision' }];

			const entries = resolveOutcomeAudits(CASE_ID, USER_ID, oldDecisions, newDecisions, userDisplayNameMap);

			const typeEntry = entries.find((e) => e.metadata?.fieldName === 'type');
			assert.strictEqual(typeEntry?.metadata?.outcomeName, 'Proposal');
		});
	});
});
