import { PROCEDURE_CONSTANTS } from '@pins/peas-row-commons-lib/constants/procedures.ts';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { handleProcedureDynamicSectionEdits, handleProcedureManageListEdits } from './update-procedures.ts';

/** Build an edit procedure object with sensible defaults, used by the manage list tests */
function buildProcedureEdit(overrides: Record<string, unknown> = {}) {
	return {
		id: 'proc-1',
		procedureTypeId: 'type-1',
		adminProcedureType: 'admin-1',
		siteVisitTypeId: 'site-1',
		inspectorId: 'inspector-1',
		procedureStatusId: 'status-1',
		...overrides
	} as any;
}

/** Build an existing procedure object with sensible defaults, used by the manage list tests */
function buildProcedure(overrides: Record<string, unknown> = {}) {
	const edit = buildProcedureEdit(overrides);
	return {
		...edit,
		Inspector: { idpUserId: edit.inspectorId }
	} as any;
}

describe('update-procedures', () => {
	describe('handleProcedureManageListEdits', () => {
		it('should return an empty query when there are no changes', () => {
			const existing = [buildProcedure()];
			const edits = [buildProcedureEdit()];

			const query = handleProcedureManageListEdits(edits, existing);

			assert.deepStrictEqual(query, {});
		});

		it('should create procedures which are not in the existing set', () => {
			const existing = [buildProcedure({ id: 'proc-1' })];
			const edits = [buildProcedureEdit({ id: 'proc-1' }), buildProcedureEdit({ id: 'proc-2' })];

			const query = handleProcedureManageListEdits(edits, existing);

			assert.deepStrictEqual(query.create, [
				{
					id: 'proc-2',
					ProcedureType: { connect: { id: 'type-1' } },
					AdminProcedureType: { connect: { id: 'admin-1' } },
					SiteVisitType: { connect: { id: 'site-1' } },
					Inspector: { connectOrCreate: { where: { idpUserId: 'inspector-1' }, create: { idpUserId: 'inspector-1' } } },
					ProcedureStatus: { connect: { id: 'status-1' } }
				}
			]);
			assert.strictEqual(query.update, undefined);
			assert.strictEqual(query.delete, undefined);
		});

		it('should not map the not-allocated inspector when creating', () => {
			const edits = [buildProcedure({ id: 'proc-new', inspectorId: PROCEDURE_CONSTANTS.NOT_ALLOCATED })];

			const query = handleProcedureManageListEdits(edits, []);

			assert.strictEqual((query.create as any[])[0].Inspector, undefined);
		});

		it('should update only the fields which have changed', () => {
			const existing = [buildProcedure({ id: 'proc-1', procedureTypeId: 'type-1', siteVisitTypeId: 'site-1' })];
			const edits = [buildProcedureEdit({ id: 'proc-1', procedureTypeId: 'type-2', siteVisitTypeId: 'site-1' })];

			const query = handleProcedureManageListEdits(edits, existing);

			assert.deepStrictEqual(query.update, [
				{
					where: { id: 'proc-1' },
					data: { ProcedureType: { connect: { id: 'type-2' } } }
				}
			]);
			assert.strictEqual(query.create, undefined);
			assert.strictEqual(query.delete, undefined);
		});

		it('should disconnect the not-allocated inspector when updating', () => {
			const existing = [buildProcedure({ id: 'proc-1', inspectorId: 'inspector-1' })];
			const edits = [buildProcedureEdit({ id: 'proc-1', inspectorId: PROCEDURE_CONSTANTS.NOT_ALLOCATED })];

			const query = handleProcedureManageListEdits(edits, existing);

			assert.deepStrictEqual(query.update, [
				{
					where: { id: 'proc-1' },
					data: { Inspector: { disconnect: true } }
				}
			]);
		});

		it('should delete procedures which are no longer in the new set', () => {
			const existing = [buildProcedure({ id: 'proc-1' }), buildProcedure({ id: 'proc-2' })];
			const edits = [buildProcedureEdit({ id: 'proc-1' })];

			const query = handleProcedureManageListEdits(edits, existing);

			assert.deepStrictEqual(query.delete, [{ id: 'proc-2' }]);
			assert.strictEqual(query.create, undefined);
			assert.strictEqual(query.update, undefined);
		});

		it('should handle create, update and delete together', () => {
			const existing = [
				buildProcedure({ id: 'proc-keep' }),
				buildProcedure({ id: 'proc-edit', procedureStatusId: 'status-1' }),
				buildProcedure({ id: 'proc-remove' })
			];
			const edits = [
				buildProcedureEdit({ id: 'proc-keep' }),
				buildProcedureEdit({ id: 'proc-edit', procedureStatusId: 'status-2' }),
				buildProcedureEdit({ id: 'proc-add' })
			];

			const query = handleProcedureManageListEdits(edits, existing);

			assert.strictEqual((query.create as any[]).length, 1);
			assert.strictEqual((query.create as any[])[0].id, 'proc-add');
			assert.deepStrictEqual(query.update, [
				{
					where: { id: 'proc-edit' },
					data: { ProcedureStatus: { connect: { id: 'status-2' } } }
				}
			]);
			assert.deepStrictEqual(query.delete, [{ id: 'proc-remove' }]);
		});
	});

	describe('handleProcedureDynamicSectionEdits', () => {
		it('should always include the where clause with the procedure id', () => {
			const updates = handleProcedureDynamicSectionEdits([{ id: 'proc-1' }]);

			assert.strictEqual(updates.length, 1);
			assert.deepStrictEqual(updates[0].where, { id: 'proc-1' });
			assert.deepStrictEqual(updates[0].data, {});
		});

		it('should connect relation fields which are present', () => {
			const updates = handleProcedureDynamicSectionEdits([
				{ id: 'proc-1', procedureTypeId: 'type-1', procedureStatusId: 'status-1' }
			]);

			assert.deepStrictEqual(updates[0].data.ProcedureType, { connect: { id: 'type-1' } });
			assert.deepStrictEqual(updates[0].data.ProcedureStatus, { connect: { id: 'status-1' } });
		});

		it('should map valid date fields to a Date and invalid/empty to null', () => {
			const updates = handleProcedureDynamicSectionEdits([
				{ id: 'proc-1', siteVisitDate: '2026-01-15T00:00:00Z', hearingTargetDate: '' }
			]);

			assert.deepStrictEqual(updates[0].data.siteVisitDate, new Date('2026-01-15T00:00:00Z'));
			assert.strictEqual(updates[0].data.hearingTargetDate, null);
		});

		it('should map decimal fields, coercing empty strings to null', () => {
			const updates = handleProcedureDynamicSectionEdits([
				{ id: 'proc-1', hearingPreparationTimeDays: '2', hearingTravelTimeDays: '' }
			]);

			assert.strictEqual(updates[0].data.hearingPreparationTimeDays, '2');
			assert.strictEqual(updates[0].data.hearingTravelTimeDays, null);
		});

		it('should connectOrCreate an inspector when allocated', () => {
			const updates = handleProcedureDynamicSectionEdits([{ id: 'proc-1', inspectorId: 'inspector-1' }]);

			assert.deepStrictEqual(updates[0].data.Inspector, {
				connectOrCreate: {
					where: { idpUserId: 'inspector-1' },
					create: { idpUserId: 'inspector-1' }
				}
			});
		});

		it('should disconnect inspector when not allocated', () => {
			const updates = handleProcedureDynamicSectionEdits([
				{ id: 'proc-1', inspectorId: PROCEDURE_CONSTANTS.NOT_ALLOCATED }
			]);

			assert.deepStrictEqual(updates[0].data.Inspector, { disconnect: true });
		});

		it('should upsert a venue address with a where clause when the address has an id', () => {
			const updates = handleProcedureDynamicSectionEdits([
				{
					id: 'proc-1',
					hearingVenue: {
						id: 'address-1',
						addressLine1: '1 Test Street',
						townCity: 'Testville',
						postcode: 'AB1 2CD'
					}
				}
			]);

			assert.deepStrictEqual(updates[0].data.HearingVenue, {
				upsert: {
					where: { id: 'address-1' },
					create: {
						line1: '1 Test Street',
						line2: '',
						townCity: 'Testville',
						county: '',
						postcode: 'AB1 2CD'
					},
					update: {
						line1: '1 Test Street',
						line2: '',
						townCity: 'Testville',
						county: '',
						postcode: 'AB1 2CD'
					}
				}
			});
		});

		it('should upsert a venue address without a where clause when the address has no id', () => {
			const updates = handleProcedureDynamicSectionEdits([
				{ id: 'proc-1', inquiryVenue: { addressLine1: '2 Test Street' } }
			]);

			assert.strictEqual((updates[0].data.InquiryVenue as any).upsert.where, undefined);
		});

		it('should handle multiple procedures', () => {
			const updates = handleProcedureDynamicSectionEdits([
				{ id: 'proc-1', procedureTypeId: 'type-1' },
				{ id: 'proc-2', conferenceDate: '2026-02-01' }
			]);

			assert.strictEqual(updates.length, 2);
			assert.deepStrictEqual(updates[0].where, { id: 'proc-1' });
			assert.deepStrictEqual(updates[1].where, { id: 'proc-2' });
			assert.deepStrictEqual(updates[1].data.conferenceDate, new Date('2026-02-01'));
		});
	});
});
