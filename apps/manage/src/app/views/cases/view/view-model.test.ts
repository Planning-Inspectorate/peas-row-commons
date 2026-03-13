import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	caseToViewModel,
	mapAndSortDecisions,
	mapNotes,
	mapProceduresToArray,
	sortProceduresChronologically
} from './view-model.ts';
import {
	DECISION_TYPE_ID,
	DECISION_MAKER_TYPE_ID,
	PROCEDURES_ID
} from '@pins/peas-row-commons-database/src/seed/static_data/ids/index.ts';
import type { CaseDecisionFields, CaseProcedureFields } from './types.ts';

describe('view-model', () => {
	const groupMembers = {
		caseOfficers: [
			{
				id: '123',
				displayName: 'Oscar'
			}
		]
	};
	describe('caseToViewModel', () => {
		it('should flatten nested Dates and Costs objects into the root', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				Dates: { targetDate: '2024-12-25' },
				Costs: { estimate: 500 }
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.targetDate, '2024-12-25');
			assert.strictEqual(result.estimate, 500);

			assert.strictEqual((result as any).Dates, undefined);
		});

		it('should NOT overwrite the main ID with nested IDs from Dates or Costs', () => {
			const input = {
				id: 'MAIN_ID',
				receivedDate: new Date(),
				Dates: { id: 'BAD_DATE_ID', targetDate: '2024-01-01' },
				Costs: { id: 'BAD_COST_ID', estimate: 100 }
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.id, 'MAIN_ID');
			assert.strictEqual(result.targetDate, '2024-01-01');
		});

		it('should convert boolean values to "Yes"/"No" strings', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				isUrgent: true,
				isClosed: false,
				status: 'INTERIM'
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.isUrgent, 'yes');
			assert.strictEqual(result.isClosed, 'no');
			assert.strictEqual(result.status, 'INTERIM');
		});

		it('should format receivedDate and create a sortable timestamp', async () => {
			const input = {
				id: '123',
				reference: 'ROW/001',
				receivedDate: new Date('2024-01-15T12:00:00.000Z'),
				Type: { displayName: 'Rights of Way' }
			};

			const result = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.receivedDateDisplay, '15 Jan 2024');
			assert.strictEqual(result.receivedDateSortable, input.receivedDate.getTime());
		});

		it('should map nested Authority object to flat authority fields', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				Authority: {
					id: '123'
				}
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.authorityId, '123');

			assert.strictEqual(result.Authority, undefined);
		});

		it('should map nested SiteAddress object to UI compatible siteAddress object', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				SiteAddress: {
					line1: '1 High St',
					line2: 'Village',
					townCity: 'London',
					county: 'Greater London',
					postcode: 'SW1 1AA'
				}
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.ok(result.siteAddress);
			assert.strictEqual(result.siteAddress.addressLine1, '1 High St');
			assert.strictEqual(result.siteAddress.addressLine2, 'Village');
			assert.strictEqual(result.siteAddress.townCity, 'London');
			assert.strictEqual(result.siteAddress.county, 'Greater London');
			assert.strictEqual(result.siteAddress.postcode, 'SW1 1AA');

			assert.strictEqual(result.line1, undefined);
			assert.strictEqual(result.SiteAddress, undefined);
		});

		it('should return null for siteAddress if no SiteAddress data exists', () => {
			const input = {
				id: '123',
				receivedDate: new Date()
			};

			const result: any = caseToViewModel(input as any, groupMembers);
			assert.strictEqual(result.siteAddress, null);
		});

		it('should pass through Inspectors data to inspectorDetails', () => {
			const mockInspectors = [
				{ id: 'insp-1', name: 'Inspector Gadget', Inspector: { idpUserId: 'test' }, inspectorId: 'test' }
			];
			const input = {
				id: '123',
				receivedDate: new Date(),
				Inspectors: mockInspectors
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.deepStrictEqual(result.inspectorDetails, mockInspectors);
		});

		it('should pass through Related Case data to relatedCaseDetails', () => {
			const mockRelations = [{ reference: 'DRO/123', id: 1 }];
			const mockOutcome = [{ relatedCaseReference: 'DRO/123', id: 1 }];
			const input = {
				id: '123',
				receivedDate: new Date(),
				RelatedCases: mockRelations
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.deepStrictEqual(result.relatedCaseDetails, mockOutcome);
		});

		it('should pass through Linked Case data to linkedCaseDetails', () => {
			const mockRelations = [{ reference: 'DRO/123', isLead: true, id: 1 }];
			const mockOutcome = [{ linkedCaseReference: 'DRO/123', linkedCaseIsLead: 'yes', id: 1 }];
			const input = {
				id: '123',
				receivedDate: new Date(),
				LinkedCases: mockRelations
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.deepStrictEqual(result.linkedCaseDetails, mockOutcome);
		});

		it('should map nested Outcome.CaseDecisions to outcomeDetails with resolved decisionMaker IDs', () => {
			const DECISION_MAKER_TYPE_ID = {
				OFFICER: 'officer',
				INSPECTOR: 'inspector'
			};

			const input = {
				id: '123',
				receivedDate: new Date(),
				Outcome: {
					CaseDecisions: [
						{
							id: 'dec-1',
							decisionMakerTypeId: DECISION_MAKER_TYPE_ID.OFFICER,
							DecisionMaker: { idpUserId: 'officer-99' },
							otherField: 'some-value'
						},
						{
							id: 'dec-2',
							decisionMakerTypeId: DECISION_MAKER_TYPE_ID.INSPECTOR,
							DecisionMaker: { idpUserId: 'inspector-00' }
						},
						{
							id: 'dec-3',
							decisionMakerTypeId: 'other-type',
							DecisionMaker: { idpUserId: 'should-not-map' }
						}
					]
				}
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.ok(Array.isArray(result.outcomeDetails));
			assert.strictEqual(result.outcomeDetails.length, 3);

			assert.strictEqual(result.outcomeDetails[0].decisionMakerOfficerId, 'officer-99');
			assert.strictEqual(result.outcomeDetails[0].decisionMakerInspectorId, undefined);
			assert.strictEqual(result.outcomeDetails[0].otherField, 'some-value');

			assert.strictEqual(result.outcomeDetails[1].decisionMakerInspectorId, 'inspector-00');
			assert.strictEqual(result.outcomeDetails[1].decisionMakerOfficerId, undefined);

			assert.strictEqual(result.outcomeDetails[2].decisionMakerOfficerId, undefined);
			assert.strictEqual(result.outcomeDetails[2].decisionMakerInspectorId, undefined);
		});

		it('should return undefined for outcomeDetails if Outcome data is missing', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				Outcome: null
			};

			const result: any = caseToViewModel(input as any, groupMembers);
			assert.deepStrictEqual(result.outcomeDetails, undefined);
		});
	});

	describe('mapNotes', () => {
		it('should map fields and sort notes by createdAt in descending order', async () => {
			const dateOld = new Date('2023-01-01T10:00:00.000Z');
			const dateNew = new Date('2024-01-01T10:00:00.000Z');

			const input = [
				{
					createdAt: dateOld,
					comment: 'Old note',
					Author: {
						idpUserId: '123'
					}
				},
				{
					createdAt: dateNew,
					comment: 'New note',
					Author: {
						idpUserId: 'user_2'
					}
				}
			];

			const result = mapNotes(input as any, groupMembers, '123');

			assert.ok(result.caseNotes);
			assert.strictEqual(result.caseNotes.length, 2);

			assert.strictEqual(result.caseNotes[0].commentText, 'New note');
			assert.strictEqual(result.caseNotes[0].userName, 'Unknown');

			assert.strictEqual(result.caseNotes[1].commentText, 'Old note');
			assert.strictEqual(result.caseNotes[1].userName, 'Oscar');

			assert.ok(result.caseNotes[0].date);
			assert.ok(result.caseNotes[0].dayOfWeek);
			assert.ok(result.caseNotes[0].time);
		});

		it('should handle an empty array of case notes', async () => {
			const input: any[] = [];
			const result = mapNotes(input, groupMembers, '123');

			assert.deepStrictEqual(result.caseNotes, []);
		});

		it('should not mutate the original array order', async () => {
			const dateOld = new Date('2023-01-01');
			const dateNew = new Date('2024-01-01');

			const input = [
				{ createdAt: dateOld, comment: 'A', Author: { idpUserId: '1' } },
				{ createdAt: dateNew, comment: 'B', Author: { idpUserId: '2' } }
			];

			mapNotes(input as any, groupMembers, '123');

			assert.strictEqual(input[0].createdAt, dateOld);
			assert.strictEqual(input[1].createdAt, dateNew);
		});

		it('should convert newline characters in the comment to HTML <br> tags', async () => {
			const input = [
				{
					createdAt: new Date('2024-01-01T10:00:00.000Z'),
					comment: 'First line\nSecond line\r\nThird line',
					Author: { idpUserId: '123' }
				}
			];

			const result = mapNotes(input as any, groupMembers, '123');

			assert.strictEqual(result.caseNotes[0].commentText, 'First line<br>Second line<br>Third line');
		});

		it('should truncate extremely long comments', async () => {
			const massiveComment = 'A'.repeat(500);

			const input = [
				{
					createdAt: new Date('2024-01-01T10:00:00.000Z'),
					comment: massiveComment,
					Author: { idpUserId: '123' }
				}
			];

			const result = mapNotes(input as any, groupMembers, '123');

			assert.notStrictEqual(result.caseNotes[0].truncatedCommentText, massiveComment);

			// The length gets truncated at 100 + ... + a "read more" link so just check that it is smaller than 500
			assert.ok(result.caseNotes[0].truncatedCommentText.length < 500);

			assert.ok(result.caseNotes[0].truncatedCommentText.includes('...'));
		});
	});

	describe('mapAndSortDecisions', () => {
		it('should return undefined when passed an undefined or empty array', async () => {
			assert.strictEqual(mapAndSortDecisions(undefined), undefined);
			assert.strictEqual(mapAndSortDecisions([]), undefined);
		});

		it('should correctly map decisionMakerOfficerId and decisionMakerInspectorId based on type', async () => {
			const input = [
				{
					id: 1,
					decisionMakerTypeId: DECISION_MAKER_TYPE_ID.OFFICER,
					DecisionMaker: { idpUserId: 'officer-123' }
				},
				{
					id: 2,
					decisionMakerTypeId: DECISION_MAKER_TYPE_ID.INSPECTOR,
					DecisionMaker: { idpUserId: 'inspector-456' }
				},
				{
					id: 3,
					decisionMakerTypeId: 'SOME_OTHER_ROLE',
					DecisionMaker: { idpUserId: 'other-789' }
				}
			];

			const result = mapAndSortDecisions(input as unknown as CaseDecisionFields[]);

			assert.ok(result);
			assert.strictEqual(result.length, 3);

			assert.strictEqual(result[0].decisionMakerOfficerId, 'officer-123');
			assert.strictEqual(result[0].decisionMakerInspectorId, undefined);

			assert.strictEqual(result[1].decisionMakerOfficerId, undefined);
			assert.strictEqual(result[1].decisionMakerInspectorId, 'inspector-456');

			assert.strictEqual(result[2].decisionMakerOfficerId, undefined);
			assert.strictEqual(result[2].decisionMakerInspectorId, undefined);
		});

		it('should push DECISION types to the end while preserving chronological order of others', async () => {
			const input = [
				{ id: 1, name: 'Normal 1', DecisionType: { id: 'OTHER_TYPE' } },
				{ id: 2, name: 'Decision 1', DecisionType: { id: DECISION_TYPE_ID.DECISION } },
				{ id: 3, name: 'Normal 2', DecisionType: { id: 'ANOTHER_TYPE' } },
				{ id: 4, name: 'Decision 2', DecisionType: { id: DECISION_TYPE_ID.DECISION } }
			];

			const result = mapAndSortDecisions(input as unknown as CaseDecisionFields[]);

			assert.ok(result);
			assert.strictEqual(result.length, 4);

			assert.strictEqual(result[0].id, 1);
			assert.strictEqual(result[1].id, 3);
			assert.strictEqual(result[2].id, 2);
			assert.strictEqual(result[3].id, 4);
		});

		it('should not mutate the original array order', async () => {
			const input = [
				{ id: 1, DecisionType: { id: DECISION_TYPE_ID.DECISION } },
				{ id: 2, DecisionType: { id: 'OTHER' } }
			];

			mapAndSortDecisions(input as unknown as CaseDecisionFields[]);

			assert.strictEqual(input[0].id, 1);
			assert.strictEqual(input[1].id, 2);
		});
	});

	describe('sortProceduresChronologically', () => {
		it('should return an empty array when passed undefined or an empty array', async () => {
			const undefinedResult = sortProceduresChronologically(undefined);
			assert.deepStrictEqual(undefinedResult, []);

			const emptyResult = sortProceduresChronologically([]);
			assert.deepStrictEqual(emptyResult, []);
		});

		it('should not mutate the original array order', async () => {
			const input = [
				{ id: 1, procedureDate: '2024-01-01', SiteVisitType: { id: 'sv' } },
				{ id: 2, procedureDate: '2024-01-01' }
			];

			sortProceduresChronologically(input as unknown as CaseProcedureFields[]);

			assert.strictEqual(input[0].id, 1);
			assert.strictEqual(input[1].id, 2);
		});

		it('should perfectly preserve the original database order if dates are different', async () => {
			const input = [
				{ id: 1, procedureDate: '2024-05-01' },
				{ id: 2, procedureDate: '2023-01-01' },
				{ id: 3, procedureDate: '2024-12-01' }
			];

			const result = sortProceduresChronologically(input as unknown as CaseProcedureFields[]);

			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].id, 1);
			assert.strictEqual(result[1].id, 2);
			assert.strictEqual(result[2].id, 3);
		});

		it('should push a Site Visit to the top if it shares the exact same date as another procedure', async () => {
			const sharedDate = '2024-03-06T10:00:00.000Z';

			const input = [
				{ id: 1, name: 'Hearing', procedureDate: sharedDate },
				{ id: 2, name: 'Site Visit', procedureDate: sharedDate, procedureTypeId: PROCEDURES_ID.SITE_VISIT },
				{ id: 3, name: 'Inquiry', procedureDate: sharedDate }
			];

			const result = sortProceduresChronologically(input as unknown as CaseProcedureFields[]);

			assert.strictEqual(result.length, 3);

			assert.strictEqual(result[0].id, 2);

			assert.strictEqual(result[1].id, 1);
			assert.strictEqual(result[2].id, 3);
		});

		it('should preserve original order if two items share a date but NEITHER are site visits', async () => {
			const sharedDate = '2024-03-06T00:00:00.000Z';

			const input = [
				{ id: 1, procedureDate: sharedDate },
				{ id: 2, procedureDate: sharedDate }
			];

			const result = sortProceduresChronologically(input as unknown as CaseProcedureFields[]);

			assert.strictEqual(result[0].id, 1);
			assert.strictEqual(result[1].id, 2);
		});

		it('should safely handle items completely missing a procedureDate', async () => {
			const input = [
				{ id: 1, name: 'No Date Normal' }, // procedureDate is undefined -> evaluates to 0
				{ id: 2, name: 'No Date Site Visit', procedureTypeId: PROCEDURES_ID.SITE_VISIT }
			];

			const result = sortProceduresChronologically(input as unknown as CaseProcedureFields[]);

			assert.strictEqual(result[0].id, 2);
			assert.strictEqual(result[1].id, 1);
		});
	});

	describe('mapProceduresToArray', () => {
		it('should return undefined if input is not an array', () => {
			assert.strictEqual(mapProceduresToArray(null as any), undefined);
			assert.strictEqual(mapProceduresToArray(undefined as any), undefined);
			assert.strictEqual(mapProceduresToArray({} as any), undefined);
		});

		it('should return undefined for an empty array', () => {
			assert.strictEqual(mapProceduresToArray([]), undefined);
		});

		it('should strip internal fields (caseId, createdAt, updatedAt)', () => {
			const input = [
				{
					id: 'proc-1',
					caseId: 'case-123',
					createdAt: new Date(),
					updatedAt: new Date(),
					procedureTypeId: 'hearing'
				}
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.strictEqual(result[0].caseId, undefined);
			assert.strictEqual(result[0].createdAt, undefined);
			assert.strictEqual(result[0].updatedAt, undefined);
			assert.strictEqual(result[0].procedureTypeId, 'hearing');
		});

		it('should strip venue ID fields (hearingVenueId, inquiryVenueId, conferenceVenueId)', () => {
			const input = [
				{
					procedureTypeId: 'hearing',
					hearingVenueId: 'venue-1',
					inquiryVenueId: 'venue-2',
					conferenceVenueId: 'venue-3'
				}
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.strictEqual(result[0].hearingVenueId, undefined);
			assert.strictEqual(result[0].inquiryVenueId, undefined);
			assert.strictEqual(result[0].conferenceVenueId, undefined);
		});

		it('should strip capitalised Prisma relation fields', () => {
			const input = [
				{
					procedureTypeId: 'hearing',
					ProcedureType: { id: 'hearing', displayName: 'Hearing' },
					ProcedureStatus: { id: 'active', displayName: 'Active' },
					HearingFormat: { id: 'virtual', displayName: 'Virtual' }
				}
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.strictEqual(result[0].ProcedureType, undefined);
			assert.strictEqual(result[0].ProcedureStatus, undefined);
			assert.strictEqual(result[0].HearingFormat, undefined);
			assert.strictEqual(result[0].procedureTypeId, 'hearing');
		});

		it('should skip null and undefined values', () => {
			const input = [
				{
					procedureTypeId: 'hearing',
					hearingTargetDate: null,
					inquiryTargetDate: undefined,
					siteVisitDate: new Date('2025-01-01')
				}
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.strictEqual(result[0].hearingTargetDate, undefined);
			assert.strictEqual(result[0].inquiryTargetDate, undefined);
			assert.ok(result[0].siteVisitDate);
		});

		it('should convert boolean values to yes/no strings', () => {
			const input = [
				{
					procedureTypeId: 'hearing',
					hearingInTarget: true,
					inquiryInTarget: false
				}
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.strictEqual(result[0].hearingInTarget, 'yes');
			assert.strictEqual(result[0].inquiryInTarget, 'no');
		});

		it('should map HearingVenue relation to hearingVenue with UI address format', () => {
			const input = [
				{
					procedureTypeId: 'hearing',
					HearingVenue: {
						line1: '10 Court Lane',
						line2: 'Floor 2',
						townCity: 'Bristol',
						county: 'Somerset',
						postcode: 'BS1 1AA'
					}
				}
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.ok(result[0].hearingVenue);
			assert.strictEqual(result[0].hearingVenue.addressLine1, '10 Court Lane');
			assert.strictEqual(result[0].hearingVenue.townCity, 'Bristol');
			assert.strictEqual(result[0].hearingVenue.postcode, 'BS1 1AA');
		});

		it('should map InquiryVenue relation to inquiryVenue with UI address format', () => {
			const input = [
				{
					procedureTypeId: 'inquiry',
					InquiryVenue: {
						line1: '456 Test Rd',
						townCity: 'Manchester',
						postcode: 'M1 1AA'
					}
				}
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.ok(result[0].inquiryVenue);
			assert.strictEqual(result[0].inquiryVenue.addressLine1, '456 Test Rd');
			assert.strictEqual(result[0].inquiryVenue.townCity, 'Manchester');
		});

		it('should map ConferenceVenue relation to conferenceVenue with UI address format', () => {
			const input = [
				{
					procedureTypeId: 'inquiry',
					ConferenceVenue: {
						line1: '789 Conf St',
						townCity: 'Leeds',
						postcode: 'LS1 1AA'
					}
				}
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.ok(result[0].conferenceVenue);
			assert.strictEqual(result[0].conferenceVenue.addressLine1, '789 Conf St');
			assert.strictEqual(result[0].conferenceVenue.townCity, 'Leeds');
		});

		it('should map multiple procedures independently', () => {
			const input = [
				{ procedureTypeId: 'hearing', procedureStatusId: 'active' },
				{ procedureTypeId: 'inquiry', procedureStatusId: 'completed' },
				{ procedureTypeId: 'admin', adminProcedureType: 'case-officer' }
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.strictEqual(result.length, 3);
			assert.strictEqual(result[0].procedureTypeId, 'hearing');
			assert.strictEqual(result[1].procedureTypeId, 'inquiry');
			assert.strictEqual(result[2].procedureTypeId, 'admin');
			assert.strictEqual(result[2].adminProcedureType, 'case-officer');
		});

		it('should pass through non-special fields like date objects and strings', () => {
			const testDate = new Date('2025-06-15');
			const input = [
				{
					procedureTypeId: 'hearing',
					siteVisitDate: testDate,
					hearingFormatId: 'face-to-face',
					lengthOfHearingEvent: 5
				}
			];

			const result = mapProceduresToArray(input);

			assert.ok(result);
			assert.strictEqual(result[0].siteVisitDate, testDate);
			assert.strictEqual(result[0].hearingFormatId, 'face-to-face');
			assert.strictEqual(result[0].lengthOfHearingEvent, 5);
		});
	});

	describe('caseToViewModel - procedure mapping', () => {
		it('should map Procedures array into procedureDetails via mapProceduresToArray', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				Procedures: [
					{
						procedureTypeId: 'hearing',
						procedureStatusId: 'active',
						siteVisitDate: new Date('2025-01-15')
					}
				]
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.ok(Array.isArray(result.procedureDetails), 'procedureDetails should be an array');
			assert.strictEqual(result.procedureDetails.length, 1);
			assert.strictEqual(result.procedureDetails[0].procedureTypeId, 'hearing');
			assert.strictEqual(result.Procedures, undefined, 'Raw Procedures should be removed');
		});

		it('should return undefined procedureDetails when Procedures is empty', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				Procedures: []
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.procedureDetails, undefined);
		});

		it('should return undefined procedureDetails when Procedures is missing', () => {
			const input = {
				id: '123',
				receivedDate: new Date()
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.procedureDetails, undefined);
		});
	});
});
