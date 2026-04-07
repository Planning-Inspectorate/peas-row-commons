import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveProcedureAudits, type ProcedureWithRelations } from './procedure-resolver.ts';
import { AUDIT_ACTIONS } from '../actions.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-performing-action';

const userDisplayNameMap = new Map([
	['entra-1', 'Charlotte Morphet'],
	['entra-2', 'Sophie Coates']
]);

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
