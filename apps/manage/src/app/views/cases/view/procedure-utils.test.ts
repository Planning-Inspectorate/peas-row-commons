import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { handleProcedureGeneric } from './procedure-utils.ts';

describe('Procedure Utils - handleProcedureGeneric', () => {
	let mockFlatData: Record<string, any>;
	let mockPrismaPayload: any;
	const caseId = 'case-123';

	beforeEach(() => {
		mockFlatData = {};
		mockPrismaPayload = {};
	});

	it('should ignore data that does not match the procedure prefix', () => {
		mockFlatData = {
			someOtherField: 'value',
			procedureTwoField: 'value'
		};

		handleProcedureGeneric(caseId, mockFlatData, mockPrismaPayload, 'One');

		assert.strictEqual(mockPrismaPayload.Procedures, undefined);
		assert.ok(mockFlatData.someOtherField);
	});

	it('should map standard scalar fields and convert to camelCase', () => {
		mockFlatData = {
			procedureOneTargetDate: '2025-01-01',
			procedureOneStatusId: 'status-123'
		};

		handleProcedureGeneric(caseId, mockFlatData, mockPrismaPayload, 'One');

		const upsertData = mockPrismaPayload.Procedures.upsert[0];

		assert.strictEqual(upsertData.create.step, 'ProcedureOne');
		assert.strictEqual(upsertData.create.targetDate, '2025-01-01');
		assert.strictEqual(upsertData.create.statusId, 'status-123');

		assert.strictEqual(upsertData.update.step, 'ProcedureOne');
		assert.strictEqual(upsertData.update.targetDate, '2025-01-01');
	});

	it('should remove processed keys from flatData', () => {
		mockFlatData = {
			procedureOneStatusId: '123',
			otherField: 'keep-me'
		};

		handleProcedureGeneric(caseId, mockFlatData, mockPrismaPayload, 'One');

		assert.strictEqual(mockFlatData.procedureOneStatusId, undefined);
		assert.strictEqual(mockFlatData.otherField, 'keep-me');
	});

	it('should handle Address Objects as nested upserts (Create & Update)', () => {
		mockFlatData = {
			procedureOneHearingVenue: {
				addressLine1: '123 Main St',
				townCity: 'Bristol',
				postcode: 'BS1 5TR'
			}
		};

		handleProcedureGeneric(caseId, mockFlatData, mockPrismaPayload, 'One');

		const upsertData = mockPrismaPayload.Procedures.upsert[0];
		const rawFieldName = 'HearingVenue';

		const createVenue = upsertData.create[rawFieldName];
		assert.deepStrictEqual(createVenue, {
			create: {
				line1: '123 Main St',
				line2: '',
				townCity: 'Bristol',
				county: '',
				postcode: 'BS1 5TR'
			}
		});

		const updateVenue = upsertData.update[rawFieldName];
		assert.ok(updateVenue.upsert);
		assert.deepStrictEqual(updateVenue.upsert.create.line1, '123 Main St');
		assert.deepStrictEqual(updateVenue.upsert.update.line1, '123 Main St');
	});

	it('should handle "Venue" fields as IDs if they are strings', () => {
		mockFlatData = {
			procedureOneHearingVenue: 'uuid-existing-venue'
		};

		handleProcedureGeneric(caseId, mockFlatData, mockPrismaPayload, 'One');

		const upsertData = mockPrismaPayload.Procedures.upsert[0];

		assert.strictEqual(upsertData.create.hearingVenueId, 'uuid-existing-venue');
		assert.strictEqual(upsertData.update.hearingVenueId, 'uuid-existing-venue');

		assert.strictEqual(upsertData.create.HearingVenue, undefined);
	});

	it('should initialize prismaPayload.Procedures if it does not exist', () => {
		handleProcedureGeneric(caseId, { procedureOneStep: 'test' }, mockPrismaPayload, 'One');

		assert.ok(mockPrismaPayload.Procedures);
		assert.ok(Array.isArray(mockPrismaPayload.Procedures.upsert));
		assert.strictEqual(mockPrismaPayload.Procedures.upsert.length, 1);
	});

	it('should append to existing prismaPayload.Procedures array', () => {
		mockPrismaPayload.Procedures = {
			upsert: [{ existing: 'data' }]
		};

		handleProcedureGeneric(caseId, { procedureOneStep: 'test' }, mockPrismaPayload, 'One');

		assert.strictEqual(mockPrismaPayload.Procedures.upsert.length, 2);
		assert.deepStrictEqual(mockPrismaPayload.Procedures.upsert[0], { existing: 'data' });
	});

	it('should construct the correct "where" clause for the upsert', () => {
		mockFlatData = { procedureTwoTypeId: 'type-1' };

		handleProcedureGeneric(caseId, mockFlatData, mockPrismaPayload, 'Two');

		const upsertData = mockPrismaPayload.Procedures.upsert[0];

		assert.deepStrictEqual(upsertData.where, {
			Unique_Procedure_Step_Per_Case: {
				caseId: 'case-123',
				step: 'ProcedureTwo'
			}
		});
	});
});
