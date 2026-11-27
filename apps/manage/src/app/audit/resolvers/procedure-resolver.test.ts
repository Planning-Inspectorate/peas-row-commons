import { UNKNOWN_USER } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AUDIT_ACTIONS } from '../actions.ts';
import { buildProcedureAuditInput, resolveProcedureAudits, type ProcedureWithRelations } from './procedure-resolver.ts';

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

describe('buildProcedureAuditInput', () => {
	it('should copy manage-list procedures with a string or null inspector without mutating them', () => {
		const procedures = [
			{ id: 'proc-1', procedureTypeId: 'hearing', inspectorId: 'entra-1' },
			{ id: 'proc-2', procedureTypeId: 'hearing', inspectorId: PROCEDURE_CONSTANTS.NOT_ALLOCATED },
			{ id: 'proc-3', procedureTypeId: 'admin-in-house', adminProcedureType: 'case-officer', inspectorId: null }
		];
		const input = buildProcedureAuditInput(procedures, true);
		assert.deepStrictEqual(input, { isManageListEdit: true, newProcedures: procedures });
		assert.notStrictEqual(input.newProcedures[0], procedures[0]);
	});

	it('should not apply inspector business rules to manage-list procedures', () => {
		const procedures = [
			{ id: 'proc-1', procedureTypeId: 'admin-in-house', adminProcedureType: 'case-officer', inspectorId: 'entra-1' }
		];
		assert.deepStrictEqual(buildProcedureAuditInput(procedures, true), {
			isManageListEdit: true,
			newProcedures: procedures
		});
	});

	it('should reject manage-list procedures without a string or null inspector', () => {
		for (const procedure of [
			{ id: 'proc-1' },
			{ id: 'proc-1', inspectorId: undefined },
			{ id: 'proc-1', inspectorId: 123 }
		]) {
			assert.throws(() => buildProcedureAuditInput([procedure], true), /must have a string or null inspectorId/);
		}
	});

	it('should allow omitted inspectors for dynamic-section edits', () => {
		const procedures = [{ id: 'proc-1', siteVisitDate: '2027-03-27' }];
		assert.deepStrictEqual(buildProcedureAuditInput(procedures, false), {
			isManageListEdit: false,
			newProcedures: procedures
		});
	});

	it('should reject malformed procedure inputs', () => {
		assert.throws(() => buildProcedureAuditInput({}, true), /must be an array/);
		for (const procedure of [null, 'proc-1', {}, { id: 123 }, { id: '' }]) {
			assert.throws(() => buildProcedureAuditInput([procedure], false), /must include a procedure id/);
		}
	});
});

describe('resolveProcedureAudits', () => {
	describe('additions', () => {
		it('should detect a new procedure being added', () => {
			const oldProcedures: ProcedureWithRelations[] = [];
			const newProcedures = [
				{ id: 'proc-new', procedureTypeId: 'hearing', inspectorId: PROCEDURE_CONSTANTS.NOT_ALLOCATED }
			];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: true,
				newProcedures
			});

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.PROCEDURE_ADDED);
			assert.strictEqual(entries[0].metadata?.procedureName, 'Hearing');
		});
		it('should not check for creates without existing procedures', () => {
			const oldProcedures: ProcedureWithRelations[] = [];
			const newProcedures = [{ id: 'proc-new', procedureTypeId: 'hearing' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('deletions', () => {
		it('should detect a procedure being removed', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures: { id: string; inspectorId: string }[] = [];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: true,
				newProcedures
			});

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.PROCEDURE_DELETED);
			assert.strictEqual(entries[0].metadata?.procedureName, 'Hearing');
		});
		it('should not check for deletes without existing procedures', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures: { id: string }[] = [];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('updates — type', () => {
		it('should detect a procedure type change', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [{ id: 'proc-1', procedureTypeId: 'inquiry' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			const typeEntry = entries.find((e) => e.metadata?.fieldName === 'type');

			assert.strictEqual(entries.length, 1);
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
			const newProcedures = [{ id: 'proc-1', procedureStatusId: 'cancelled' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			const statusEntry = entries.find((e) => e.metadata?.fieldName === 'status');

			assert.strictEqual(entries.length, 1);
			assert.ok(statusEntry);
			assert.strictEqual(statusEntry?.metadata?.procedureName, 'Hearing');
			assert.strictEqual(statusEntry?.metadata?.procedureStatus, 'Active');
		});
	});

	describe('updates — inspector', () => {
		it('should audit inspector removal when a normalised manage-list edit clears it', () => {
			const entries = resolveProcedureAudits(
				CASE_ID,
				USER_ID,
				[buildOldProcedure({ Inspector: { idpUserId: 'entra-1' } })],
				userDisplayNameMap,
				{ isManageListEdit: true, newProcedures: [{ id: 'proc-1', inspectorId: null }] }
			);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].metadata?.fieldName, 'inspector');
			assert.strictEqual(entries[0].metadata?.oldValue, 'Charlotte Morphet');
			assert.strictEqual(entries[0].metadata?.newValue, PROCEDURE_CONSTANTS.NOT_ALLOCATED_DISPLAY);
		});

		it('should audit an explicit not-allocated removal in a manage-list edit', () => {
			const entries = resolveProcedureAudits(
				CASE_ID,
				USER_ID,
				[buildOldProcedure({ Inspector: { idpUserId: 'entra-1' } })],
				userDisplayNameMap,
				{ isManageListEdit: true, newProcedures: [{ id: 'proc-1', inspectorId: PROCEDURE_CONSTANTS.NOT_ALLOCATED }] }
			);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].metadata?.fieldName, 'inspector');
			assert.strictEqual(entries[0].metadata?.oldValue, 'Charlotte Morphet');
			assert.strictEqual(entries[0].metadata?.newValue, PROCEDURE_CONSTANTS.NOT_ALLOCATED_DISPLAY);
		});

		it('should detect an inspector change with display names', () => {
			const oldProcedures = [buildOldProcedure({ Inspector: { idpUserId: 'entra-1' } })];
			const newProcedures = [{ id: 'proc-1', inspectorId: 'entra-2' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			const inspectorEntry = entries.find((e) => e.metadata?.fieldName === 'inspector');

			assert.strictEqual(entries.length, 1);
			assert.ok(inspectorEntry);
			assert.strictEqual(inspectorEntry?.metadata?.oldValue, 'Charlotte Morphet');
			assert.strictEqual(inspectorEntry?.metadata?.newValue, 'Sophie Coates');
		});

		it('should audit removal of a migrated inspector when saved as not allocated in the manage list', () => {
			for (const inspectorId of [null, '', PROCEDURE_CONSTANTS.NOT_ALLOCATED]) {
				const entries = resolveProcedureAudits(
					CASE_ID,
					USER_ID,
					[buildOldProcedure({ Inspector: { idpUserId: null, legacyId: 'legacy-1' } })],
					userDisplayNameMap,
					{ isManageListEdit: true, newProcedures: [{ id: 'proc-1', inspectorId }] }
				);
				assert.strictEqual(entries.length, 1);
				assert.strictEqual(entries[0].metadata?.fieldName, 'inspector');
				assert.strictEqual(entries[0].metadata?.oldValue, UNKNOWN_USER);
				assert.strictEqual(entries[0].metadata?.newValue, PROCEDURE_CONSTANTS.NOT_ALLOCATED_DISPLAY);
			}
		});

		it('should audit explicit dynamic-section removal of an inspector without an Entra ID', () => {
			for (const inspectorId of [null, PROCEDURE_CONSTANTS.NOT_ALLOCATED]) {
				const entries = resolveProcedureAudits(
					CASE_ID,
					USER_ID,
					[buildOldProcedure({ Inspector: { idpUserId: null } })],
					userDisplayNameMap,
					{ isManageListEdit: false, newProcedures: [{ id: 'proc-1', inspectorId }] }
				);

				assert.strictEqual(entries.length, 1);
				assert.strictEqual(entries[0].metadata?.fieldName, 'inspector');
				assert.strictEqual(entries[0].metadata?.oldValue, UNKNOWN_USER);
				assert.strictEqual(entries[0].metadata?.newValue, PROCEDURE_CONSTANTS.NOT_ALLOCATED_DISPLAY);
			}
		});

		const resolveCaseOfficerListSaveInspectorEntries = (oldAdminProcedureType: string) =>
			resolveProcedureAudits(
				CASE_ID,
				USER_ID,
				[
					buildOldProcedure({
						procedureTypeId: 'admin-in-house',
						adminProcedureType: oldAdminProcedureType,
						Inspector: { idpUserId: null, legacyId: 'legacy-1' }
					})
				],
				userDisplayNameMap,
				{
					isManageListEdit: true,
					newProcedures: [
						{ id: 'proc-1', procedureTypeId: 'admin-in-house', adminProcedureType: 'case-officer', inspectorId: null }
					]
				}
			).filter((entry) => entry.metadata?.fieldName === 'inspector');

		it('should not audit migrated inspector removal when switching to a case officer', () => {
			assert.strictEqual(resolveCaseOfficerListSaveInspectorEntries('inspector').length, 0);
		});

		it('should not audit inspector removal implied by switching an admin procedure to case officer', () => {
			const entries = resolveProcedureAudits(
				CASE_ID,
				USER_ID,
				[
					buildOldProcedure({
						procedureTypeId: 'admin-in-house',
						ProcedureType: { id: 'admin-in-house', displayName: 'Admin' },
						adminProcedureType: 'inspector',
						AdminProcedureType: { id: 'inspector', displayName: 'Inspector' },
						Inspector: { idpUserId: 'entra-1' }
					})
				],
				userDisplayNameMap,
				{
					isManageListEdit: true,
					newProcedures: [
						{ id: 'proc-1', procedureTypeId: 'admin-in-house', adminProcedureType: 'case-officer', inspectorId: null }
					]
				}
			);

			assert.deepStrictEqual(
				entries.map((e) => e.metadata?.fieldName),
				['admin procedure type']
			);
		});

		it('should not audit inspector removal implied by changing procedure type to case officer admin', () => {
			const entries = resolveProcedureAudits(
				CASE_ID,
				USER_ID,
				[buildOldProcedure({ Inspector: { idpUserId: 'entra-1' } })],
				userDisplayNameMap,
				{
					isManageListEdit: true,
					newProcedures: [
						{ id: 'proc-1', procedureTypeId: 'admin-in-house', adminProcedureType: 'case-officer', inspectorId: null }
					]
				}
			);

			assert.deepStrictEqual(
				entries.map((e) => e.metadata?.fieldName),
				['type', 'admin procedure type']
			);
		});

		it('should audit migrated inspector removal on an unchanged case-officer procedure', () => {
			const entries = resolveCaseOfficerListSaveInspectorEntries('case-officer');
			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].metadata?.oldValue, UNKNOWN_USER);
			assert.strictEqual(entries[0].metadata?.newValue, PROCEDURE_CONSTANTS.NOT_ALLOCATED_DISPLAY);
		});

		it('should audit replacement of an inspector without an Entra ID', () => {
			const entries = resolveProcedureAudits(
				CASE_ID,
				USER_ID,
				[buildOldProcedure({ Inspector: { idpUserId: null } })],
				userDisplayNameMap,
				{ isManageListEdit: true, newProcedures: [{ id: 'proc-1', inspectorId: 'entra-2' }] }
			);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].metadata?.oldValue, UNKNOWN_USER);
			assert.strictEqual(entries[0].metadata?.newValue, 'Sophie Coates');
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

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			const inspectorEntry = entries.find((e) => e.metadata?.fieldName === 'inspector');
			assert.strictEqual(inspectorEntry, undefined);
		});

		it('should not produce an entry when inspector is not edited', () => {
			const oldProcedures = [buildOldProcedure({ Inspector: { idpUserId: 'entra-1' } })];
			const newProcedures = [{ id: 'proc-1' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			assert.strictEqual(entries.length, 0);
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

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			const dateEntry = entries.find((e) => e.metadata?.fieldName === 'target hearing date');

			assert.strictEqual(entries.length, 1);
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

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

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

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

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

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

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

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

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

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

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

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

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

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			assert.strictEqual(entries.length, 0);
		});

		it('should return no entries when both lists are empty', () => {
			const entries = resolveProcedureAudits(CASE_ID, USER_ID, [], userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures: []
			});

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('context labels', () => {
		it('should use the old procedure type and status as context in update entries', () => {
			const oldProcedures = [buildOldProcedure()];
			const newProcedures = [{ id: 'proc-1', procedureTypeId: 'inquiry', procedureStatusId: 'active' }];

			const entries = resolveProcedureAudits(CASE_ID, USER_ID, oldProcedures, userDisplayNameMap, {
				isManageListEdit: false,
				newProcedures
			});

			assert.strictEqual(entries[0].metadata?.procedureName, 'Hearing');
			assert.strictEqual(entries[0].metadata?.procedureStatus, 'Active');
		});
	});
});
