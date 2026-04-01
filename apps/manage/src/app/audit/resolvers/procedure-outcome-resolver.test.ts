import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	resolveProcedureAudits,
	resolveOutcomeAudits,
	type ProcedureWithRelations,
	type DecisionWithRelations
} from './procedure-outcome-resolver.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-performing-action';

const userDisplayNameMap = new Map([
	['entra-1', 'Charlotte Morphet'],
	['entra-2', 'Sophie Coates']
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildOldProcedure(overrides: Partial<Record<string, unknown>> = {}): ProcedureWithRelations {
	return {
		id: 'proc-1',
		caseId: CASE_ID,
		procedureTypeId: 'hearing',
		procedureStatusId: 'active',
		createdDate: new Date(),
		ProcedureType: { id: 'hearing', displayName: 'Hearing' },
		ProcedureStatus: { id: 'active', displayName: 'Active' },
		Inspector: null,
		HearingFormat: null,
		InquiryFormat: null,
		ConferenceFormat: null,
		PreInquiryMeetingFormat: null,
		InquiryOrConference: null,
		HearingVenue: null,
		InquiryVenue: null,
		ConferenceVenue: null,
		AdminProcedureType: null,
		SiteVisitType: null,
		// All date/number fields default to null
		siteVisitDate: null,
		caseOfficerVerificationDate: null,
		hearingTargetDate: null,
		earliestHearingDate: null,
		confirmedHearingDate: null,
		hearingClosedDate: null,
		hearingDateNotificationDate: null,
		hearingVenueNotificationDate: null,
		partiesNotifiedOfHearingDate: null,
		hearingPreparationTimeDays: null,
		hearingTravelTimeDays: null,
		hearingSittingTimeDays: null,
		hearingReportingTimeDays: null,
		inquiryTargetDate: null,
		earliestInquiryDate: null,
		confirmedInquiryDate: null,
		inquiryClosedDate: null,
		inquiryDateNotificationDate: null,
		inquiryVenueNotificationDate: null,
		partiesNotifiedOfInquiryDate: null,
		inquiryPreparationTimeDays: null,
		inquiryTravelTimeDays: null,
		inquirySittingTimeDays: null,
		inquiryReportingTimeDays: null,
		conferenceDate: null,
		conferenceNoteSentDate: null,
		preInquiryMeetingDate: null,
		preInquiryNoteSentDate: null,
		proofsOfEvidenceReceivedDate: null,
		statementsOfCaseReceivedDate: null,
		inHouseDate: null,
		offerForWrittenRepresentationsDate: null,
		deadlineForConsentDate: null,
		...overrides
	} as unknown as ProcedureWithRelations;
}

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

// ─── Procedure tests ─────────────────────────────────────────────────────────

describe('resolveProcedureAudits', () => {
	describe('additions', () => {
		it('should detect a new procedure being added', () => {
			const oldProcedures: ProcedureWithRelations[] = [];
			const newProcedures = [{ id: 'proc-new', procedureTypeId: 'hearing' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.PROCEDURE_ADDED);
			assert.strictEqual(entries[0].metadata?.procedureName, 'Hearing');
		});
	});

	describe('deletions', () => {
		it('should detect a procedure being removed', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures: Record<string, unknown>[] = [];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.PROCEDURE_DELETED);
			assert.strictEqual(entries[0].metadata?.procedureName, 'Hearing');
		});
	});

	describe('updates — type', () => {
		it('should detect a procedure type change', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [{ id: 'proc-1', procedureTypeId: 'inquiry', procedureStatusId: 'active' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const typeEntry = entries.find((e) => e.metadata?.fieldName === 'type');

			assert.ok(typeEntry);
			assert.strictEqual(typeEntry?.metadata?.procedureName, 'Hearing');
			assert.strictEqual(typeEntry?.metadata?.procedureStatus, 'Active');
			assert.ok(typeEntry?.metadata?.oldValue);
			assert.ok(typeEntry?.metadata?.newValue);
		});
	});

	describe('updates — status', () => {
		it('should detect a procedure status change', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [{ id: 'proc-1', procedureTypeId: 'hearing', procedureStatusId: 'cancelled' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const statusEntry = entries.find((e) => e.metadata?.fieldName === 'status');

			assert.ok(statusEntry);
			assert.strictEqual(statusEntry?.metadata?.procedureName, 'Hearing');
			assert.strictEqual(statusEntry?.metadata?.procedureStatus, 'Active');
		});
	});

	describe('updates — inspector', () => {
		it('should detect an inspector change with display names', () => {
			const oldProcedures = [buildOldProcedure({ Inspector: { idpUserId: 'entra-1' } })];
			const newProcedures = [
				{ id: 'proc-1', procedureTypeId: 'hearing', procedureStatusId: 'active', inspectorId: 'entra-2' }
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const inspectorEntry = entries.find((e) => e.metadata?.fieldName === 'inspector');

			assert.ok(inspectorEntry);
			assert.strictEqual(inspectorEntry?.metadata?.oldValue, 'Charlotte Morphet');
			assert.strictEqual(inspectorEntry?.metadata?.newValue, 'Sophie Coates');
		});

		it('should not produce an entry when inspector is NOT_ALLOCATED and DB has null', () => {
			const oldProcedures = [buildOldProcedure({ Inspector: null })];
			const newProcedures = [
				{
					id: 'proc-1',
					procedureTypeId: 'hearing',
					procedureStatusId: 'active',
					inspectorId: PROCEDURE_CONSTANTS.NOT_ALLOCATED
				}
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const inspectorEntry = entries.find((e) => e.metadata?.fieldName === 'inspector');
			assert.strictEqual(inspectorEntry, undefined);
		});
	});

	describe('updates — detail fields (dates)', () => {
		it('should detect a hearing target date being set', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [
				{
					id: 'proc-1',
					procedureTypeId: 'hearing',
					procedureStatusId: 'active',
					hearingTargetDate: '2026-04-15'
				}
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const dateEntry = entries.find((e) => e.metadata?.fieldName === 'target hearing date');

			assert.ok(dateEntry);
			assert.strictEqual(dateEntry?.metadata?.oldValue, '-');
			assert.strictEqual(dateEntry?.metadata?.newValue, '15 April 2026');
		});

		it('should detect a date being changed', () => {
			const oldProcedures = [buildOldProcedure({ proofsOfEvidenceReceivedDate: new Date('2025-01-01') })];
			const newProcedures = [
				{
					id: 'proc-1',
					procedureTypeId: 'hearing',
					procedureStatusId: 'active',
					proofsOfEvidenceReceivedDate: '2025-06-01'
				}
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const dateEntry = entries.find((e) => e.metadata?.fieldName === 'proofs of evidence received');

			assert.ok(dateEntry);
			assert.strictEqual(dateEntry?.metadata?.oldValue, '1 January 2025');
			assert.strictEqual(dateEntry?.metadata?.newValue, '1 June 2025');
		});
	});

	describe('updates — detail fields (numbers)', () => {
		it('should detect a numeric field being set', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [
				{
					id: 'proc-1',
					procedureTypeId: 'hearing',
					procedureStatusId: 'active',
					hearingTravelTimeDays: 2
				}
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const numEntry = entries.find((e) => e.metadata?.fieldName === 'hearing travel time (days)');

			assert.ok(numEntry);
			assert.strictEqual(numEntry?.metadata?.oldValue, '-');
			assert.strictEqual(numEntry?.metadata?.newValue, '2');
		});
	});

	describe('updates — relation fields', () => {
		it('should detect a hearing format being set', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [
				{
					id: 'proc-1',
					procedureTypeId: 'hearing',
					procedureStatusId: 'active',
					hearingFormatId: 'face-to-face'
				}
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const formatEntry = entries.find((e) => e.metadata?.fieldName === 'hearing type');

			assert.ok(formatEntry);
			assert.strictEqual(formatEntry?.metadata?.oldValue, '-');
			// newValue depends on PROCEDURE_EVENT_FORMATS seed data
			assert.ok(formatEntry?.metadata?.newValue !== '-');
		});

		it('should detect a hearing format being changed', () => {
			const oldProcedures = [
				buildOldProcedure({
					HearingFormat: { id: 'face-to-face', displayName: 'Face to face' }
				})
			];
			const newProcedures = [
				{
					id: 'proc-1',
					procedureTypeId: 'hearing',
					procedureStatusId: 'active',
					hearingFormatId: 'virtual'
				}
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const formatEntry = entries.find((e) => e.metadata?.fieldName === 'hearing type');

			assert.ok(formatEntry);
			assert.strictEqual(formatEntry?.metadata?.oldValue, 'Face to face');
		});
	});

	describe('updates — venue fields', () => {
		it('should detect a hearing venue being set', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [
				{
					id: 'proc-1',
					procedureTypeId: 'hearing',
					procedureStatusId: 'active',
					hearingVenue: {
						addressLine1: '10 Downing Street',
						townCity: 'London',
						postcode: 'SW1A 2AA'
					}
				}
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const venueEntry = entries.find((e) => e.metadata?.fieldName === 'hearing venue');

			assert.ok(venueEntry);
			assert.strictEqual(venueEntry?.metadata?.oldValue, '-');
			assert.strictEqual(venueEntry?.metadata?.newValue, '10 Downing Street, London, SW1A 2AA');
		});

		it('should detect a venue address change', () => {
			const oldProcedures = [
				buildOldProcedure({
					HearingVenue: {
						line1: '10 Downing Street',
						townCity: 'London',
						postcode: 'SW1A 2AA'
					}
				})
			];
			const newProcedures = [
				{
					id: 'proc-1',
					procedureTypeId: 'hearing',
					procedureStatusId: 'active',
					hearingVenue: {
						addressLine1: 'Buckingham Palace',
						townCity: 'London',
						postcode: 'SW1A 1AA'
					}
				}
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			const venueEntry = entries.find((e) => e.metadata?.fieldName === 'hearing venue');

			assert.ok(venueEntry);
			assert.strictEqual(venueEntry?.metadata?.oldValue, '10 Downing Street, London, SW1A 2AA');
			assert.strictEqual(venueEntry?.metadata?.newValue, 'Buckingham Palace, London, SW1A 1AA');
		});
	});

	describe('no changes', () => {
		it('should return no entries when procedure has not changed', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [{ id: 'proc-1', procedureTypeId: 'hearing', procedureStatusId: 'active' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			assert.strictEqual(entries.length, 0);
		});

		it('should return no entries when both lists are empty', () => {
			const entries = resolveProcedureAudits(CASE_ID, USER_ID, [], [], userDisplayNameMap);

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('context labels', () => {
		it('should use the old procedure type and status as context in update entries', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [{ id: 'proc-1', procedureTypeId: 'inquiry', procedureStatusId: 'active' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, newProcedures, userDisplayNameMap);

			assert.strictEqual(entries[0].metadata?.procedureName, 'Hearing');
			assert.strictEqual(entries[0].metadata?.procedureStatus, 'Active');
		});
	});
});

// ─── Outcome tests ───────────────────────────────────────────────────────────

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
			// newValue should include the conditions comment
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
