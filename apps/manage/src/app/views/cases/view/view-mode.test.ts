import { describe, it } from 'node:test';
import assert from 'node:assert';
import { caseToViewModel, mapNotes, mapProcedures } from './view-model.ts';

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

		it('should map nested Applicant object to flat applicant fields', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				Applicant: {
					name: 'John Doe'
				}
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.applicantName, 'John Doe');

			assert.strictEqual(result.Applicant, undefined);
		});

		it('should map nested Authority object to flat authority fields', () => {
			const input = {
				id: '123',
				receivedDate: new Date(),
				Authority: {
					name: 'Local Council'
				}
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.authorityName, 'Local Council');

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
			const mockInspectors = [{ id: 'insp-1', name: 'Inspector Gadget' }];
			const input = {
				id: '123',
				receivedDate: new Date(),
				Inspectors: mockInspectors
			};

			const result: any = caseToViewModel(input as any, groupMembers);

			assert.strictEqual(result.inspectorDetails, mockInspectors);
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
					userId: '123'
				},
				{
					createdAt: dateNew,
					comment: 'New note',
					userId: 'user_2'
				}
			];

			const result = mapNotes(input as any, groupMembers);

			assert.ok(result.caseNotes);
			assert.strictEqual(result.caseNotes.length, 2);

			assert.strictEqual(result.caseNotes[0].commentText, 'New note');
			assert.strictEqual(result.caseNotes[0].userName, 'Unknown');

			assert.strictEqual(result.caseNotes[1].commentText, 'Old note');
			assert.strictEqual(result.caseNotes[1].userName, 'Unknown');

			assert.ok(result.caseNotes[0].date);
			assert.ok(result.caseNotes[0].dayOfWeek);
			assert.ok(result.caseNotes[0].time);
		});

		it('should handle an empty array of case notes', async () => {
			const input: any[] = [];
			const result = mapNotes(input, groupMembers);

			assert.deepStrictEqual(result.caseNotes, []);
		});

		it('should not mutate the original array order', async () => {
			const dateOld = new Date('2023-01-01');
			const dateNew = new Date('2024-01-01');

			const input = [
				{ createdAt: dateOld, comment: 'A', userId: '1' },
				{ createdAt: dateNew, comment: 'B', userId: '2' }
			];

			mapNotes(input as any, groupMembers);

			assert.strictEqual(input[0].createdAt, dateOld);
			assert.strictEqual(input[1].createdAt, dateNew);
		});
	});
	describe('mapProcedures', () => {
		it('should flatten procedure fields and prefix them with the step name', () => {
			const input = [
				{
					step: 'ProcedureOne',
					status: 'Open',
					targetDate: new Date('2025-01-01')
				},
				{
					step: 'ProcedureTwo',
					status: 'Closed'
				}
			];

			const result = mapProcedures(input);

			assert.strictEqual(result.procedureOneStatus, 'Open');
			assert.ok(result.procedureOneTargetDate);

			assert.strictEqual(result.procedureTwoStatus, 'Closed');
		});

		it('should transform Venue objects using mapAddress when key ends in "Venue"', () => {
			const input = [
				{
					step: 'ProcedureOne',
					HearingVenue: {
						line1: '123 Fake St',
						townCity: 'Bristol',
						postcode: 'BS1 5TR'
					}
				}
			];

			const result = mapProcedures(input);

			const venue = result.procedureOneHearingVenue;

			assert.ok(venue, 'Venue object should exist');
			assert.strictEqual(venue.addressLine1, '123 Fake St');
			assert.strictEqual(venue.townCity, 'Bristol');
			assert.strictEqual(venue.postcode, 'BS1 5TR');
		});

		it('should format boolean values using formatValue (e.g. Yes/No)', () => {
			const input = [
				{
					step: 'ProcedureOne',
					isUrgent: true,
					hasFinished: false
				}
			];

			const result = mapProcedures(input);

			assert.strictEqual(result.procedureOneIsUrgent, 'yes');
			assert.strictEqual(result.procedureOneHasFinished, 'no');
		});

		it('should ignore excluded keys (id, caseId, etc) and null values', () => {
			const input = [
				{
					step: 'ProcedureOne',
					id: 'ignore-me',
					caseId: 'ignore-me-too',
					createdAt: new Date(),
					validField: 'keep-me',
					emptyField: null
				}
			];

			const result = mapProcedures(input);

			assert.strictEqual(result.procedureOneValidField, 'keep-me');

			assert.strictEqual(result.procedureOneId, undefined);
			assert.strictEqual(result.procedureOneCaseId, undefined);
			assert.strictEqual(result.procedureOneCreatedAt, undefined);

			assert.strictEqual(result.procedureOneEmptyField, undefined);
		});

		it('should return empty object if input is not an array', () => {
			assert.deepStrictEqual(mapProcedures(null as any), {});
			assert.deepStrictEqual(mapProcedures(undefined as any), {});
			assert.deepStrictEqual(mapProcedures({} as any), {});
		});
	});
});
