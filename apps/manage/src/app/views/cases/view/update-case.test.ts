import { ACT_SECTIONS } from '@pins/peas-row-commons-database/src/seed/static-data/act-sections.ts';
import { ACT_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/act.ts';
import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/status.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';
import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { buildUpdateCase, handleAbeyancePeriod, mapCasePayload } from './update-case.ts';

const mockFindUnique = mock.fn();
const mockUpdate = mock.fn();
const mockCaseRelationshipDeleteMany = mock.fn();
const mockCaseRelationshipCreate = mock.fn();
const mockCaseRelationshipCreateMany = mock.fn();

const mockTx = {
	case: {
		findUnique: mockFindUnique,
		update: mockUpdate
	},
	caseRelationship: {
		deleteMany: mockCaseRelationshipDeleteMany,
		create: mockCaseRelationshipCreate,
		createMany: mockCaseRelationshipCreateMany
	}
};

const mockDbTransaction = mock.fn(async (callback) => {
	return callback(mockTx);
});

const mockDb = {
	$transaction: mockDbTransaction
};

const mockService = {
	db: mockDb as any,
	logger: mockLogger(),
	audit: {
		record: mock.fn(() => Promise.resolve()),
		recordMany: mock.fn(() => Promise.resolve())
	},
	authConfig: {
		groups: {
			applicationAccess: 'mock-group-id'
		}
	},
	entraGroupIds: {
		allUsers: 'mock-group-id',
		caseOfficers: 'mock-group-id',
		inspectors: 'mock-group-id'
	},
	getEntraClient: () => ({
		listAllGroupMembers: async () => [{ id: 'user-123', displayName: 'Test User' }]
	})
};

describe('Update Case Controller', () => {
	beforeEach(() => {
		// Reset mocks before each test
		mockFindUnique.mock.resetCalls();
		mockUpdate.mock.resetCalls();
		mockDbTransaction.mock.resetCalls();
		mockCaseRelationshipDeleteMany.mock.resetCalls();
		mockCaseRelationshipCreate.mock.resetCalls();
		mockCaseRelationshipCreateMany.mock.resetCalls();
		mockService.logger.info.mock.resetCalls();
	});

	describe('buildUpdateCase', () => {
		it('should throw error if id param is missing', async () => {
			const req = { params: {} };
			const handler = buildUpdateCase(mockService as any);

			await assert.rejects(() => handler({ req: req as any, res: {} as any, data: {} }));
		});

		it('should log and return early if there are no answers to save', async () => {
			const req = { params: { id: 'case-123' } };
			const data = { answers: {} };

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockService.logger.info.mock.callCount(), 2);
			assert.strictEqual(mockDbTransaction.mock.callCount(), 0);
		});

		it('should clear answers (set to null) if clearAnswer flag is true', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { name: 'Keep Me' } };

			const handler = buildUpdateCase(mockService as any, true);

			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];

			assert.strictEqual(updateArgs.data.name, null);
		});

		it('should update valid case data correctly', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { name: 'New Name' } };

			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockDbTransaction.mock.callCount(), 1);
			assert.strictEqual(mockUpdate.mock.callCount(), 1);

			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.where.id, 'case-123');
			assert.strictEqual(updateArgs.data.name, 'New Name');
		});

		it('should throw "Case not found" if case does not exist', async () => {
			const req = { params: { id: 'missing-case' } };
			const data = { answers: { name: 'Val' } };

			mockFindUnique.mock.mockImplementationOnce(() => null as any);

			const handler = buildUpdateCase(mockService as any);

			await assert.rejects(() => handler({ req: req as any, res: {} as any, data }), { message: 'Case not found' });

			assert.strictEqual(mockUpdate.mock.callCount(), 0);
		});

		it('should clear answers (set to null) if saved as an empty string when trimmed', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { name: ' ' } };

			const handler = buildUpdateCase(mockService as any);
			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.data.name, null);
		});

		it('should make this case the lead (hub) and its submitted rows its children when no row is marked lead', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = {
				answers: {
					linkedCaseDetails: [
						{ linkedCaseId: 'case-id-1', linkedCaseIsLead: 'no' },
						{ linkedCaseId: 'case-id-2', linkedCaseIsLead: 'no' }
					]
				}
			};

			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockCaseRelationshipDeleteMany.mock.callCount(), 2);
			assert.deepStrictEqual(mockCaseRelationshipDeleteMany.mock.calls[0].arguments[0], {
				where: { parentCaseId: { in: ['case-123'] } }
			});
			assert.deepStrictEqual(mockCaseRelationshipDeleteMany.mock.calls[1].arguments[0], {
				where: { childCaseId: { in: ['case-123', 'case-id-1', 'case-id-2'] } }
			});

			assert.strictEqual(mockCaseRelationshipCreateMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockCaseRelationshipCreateMany.mock.calls[0].arguments[0], {
				data: [
					{ parentCaseId: 'case-123', childCaseId: 'case-id-1' },
					{ parentCaseId: 'case-123', childCaseId: 'case-id-2' }
				]
			});
		});

		it('should make this case a child of the lead case, and reparent its siblings to that lead case too', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = {
				answers: {
					linkedCaseDetails: [
						{ linkedCaseId: 'case-id-lead', linkedCaseIsLead: 'yes' },
						{ linkedCaseId: 'case-id-sibling', linkedCaseIsLead: 'no' }
					]
				}
			};

			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockCaseRelationshipDeleteMany.mock.callCount(), 2);
			assert.deepStrictEqual(mockCaseRelationshipDeleteMany.mock.calls[0].arguments[0], {
				where: { parentCaseId: { in: ['case-123', 'case-id-lead'] } }
			});
			assert.deepStrictEqual(mockCaseRelationshipDeleteMany.mock.calls[1].arguments[0], {
				where: { childCaseId: { in: ['case-123', 'case-id-sibling'] } }
			});

			assert.strictEqual(mockCaseRelationshipCreateMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockCaseRelationshipCreateMany.mock.calls[0].arguments[0], {
				data: [
					{ parentCaseId: 'case-id-lead', childCaseId: 'case-123' },
					{ parentCaseId: 'case-id-lead', childCaseId: 'case-id-sibling' }
				]
			});
		});

		it('should clear all linked case relationships when linkedCaseDetails is submitted empty', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { linkedCaseDetails: [] } };

			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockCaseRelationshipDeleteMany.mock.callCount(), 2);
			assert.deepStrictEqual(mockCaseRelationshipDeleteMany.mock.calls[0].arguments[0], {
				where: { parentCaseId: { in: ['case-123'] } }
			});
			assert.deepStrictEqual(mockCaseRelationshipDeleteMany.mock.calls[1].arguments[0], {
				where: { childCaseId: { in: ['case-123'] } }
			});

			assert.strictEqual(mockCaseRelationshipCreateMany.mock.callCount(), 0);
		});

		it('should collapse the wipe scope to a single root when the lead is unchanged, so a dropped sibling is wiped along with it', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = {
				answers: {
					linkedCaseDetails: [{ linkedCaseId: 'case-id-lead', linkedCaseIsLead: 'yes' }]
				}
			};

			mockFindUnique.mock.mockImplementationOnce(
				() =>
					({
						id: 'case-123',
						reference: 'REF-001',
						ParentRelationship: {
							id: 'rel-1',
							parentCaseId: 'case-id-lead',
							ParentCase: { id: 'case-id-lead', reference: 'LEAD-REF' }
						}
					}) as any
			);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockCaseRelationshipDeleteMany.mock.callCount(), 2);
			// This wipes every child of 'case-id-lead', including any dropped sibling's row,
			// not just the ones resubmitted.
			assert.deepStrictEqual(mockCaseRelationshipDeleteMany.mock.calls[0].arguments[0], {
				where: { parentCaseId: { in: ['case-id-lead'] } }
			});
			assert.deepStrictEqual(mockCaseRelationshipDeleteMany.mock.calls[1].arguments[0], {
				where: { childCaseId: { in: ['case-123'] } }
			});

			// Any dropped sibling is absent here too: only the resubmitted case is recreated
			// as a child of the lead.
			assert.strictEqual(mockCaseRelationshipCreateMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockCaseRelationshipCreateMany.mock.calls[0].arguments[0], {
				data: [{ parentCaseId: 'case-id-lead', childCaseId: 'case-123' }]
			});
		});

		it('should not touch CaseRelationship when linkedCaseDetails is not submitted', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { name: 'New Name' } };

			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockCaseRelationshipDeleteMany.mock.callCount(), 0);
			assert.strictEqual(mockCaseRelationshipCreate.mock.callCount(), 0);
			assert.strictEqual(mockCaseRelationshipCreateMany.mock.callCount(), 0);
		});
	});

	describe('mapCasePayload (Transformation Logic)', () => {
		it('should keep main table fields at root level', () => {
			const input = { name: 'My Case', reference: 'REF001' };
			const result = mapCasePayload(input);

			assert.strictEqual(result.name, 'My Case');
			assert.strictEqual(result.reference, 'REF001');
			assert.strictEqual((result as any).Dates, undefined);
		});

		it('should nest Date fields into "Dates" upsert object', () => {
			const input = { startDate: '2025-01-01', expiryDate: '2025-12-31' };
			const result = mapCasePayload(input);

			const datesUpdate = (result as any).Dates;

			assert.ok(datesUpdate, 'Should have Dates property');
			assert.ok(datesUpdate.upsert, 'Should be an upsert');

			assert.strictEqual(datesUpdate.upsert.create.startDate, '2025-01-01');
			assert.strictEqual(datesUpdate.upsert.create.expiryDate, '2025-12-31');

			assert.strictEqual(datesUpdate.upsert.update.startDate, '2025-01-01');
		});

		it('should handle mixed main and nested fields', () => {
			const input = {
				name: 'Main Field',
				startDate: '2025-01-01'
			};
			const result = mapCasePayload(input);

			assert.strictEqual(result.name, 'Main Field');
			assert.strictEqual((result as any).Dates.upsert.create.startDate, '2025-01-01');
		});

		it('should transform authority fields into Authority connect', () => {
			const input = {
				authorityName: '123'
			};
			const result = mapCasePayload(input);

			const authorityUpdate = (result as any).Authority;
			assert.ok(authorityUpdate, 'Should have Authority property');

			assert.deepStrictEqual(authorityUpdate.connect, {
				id: '123'
			});

			assert.strictEqual((result as any).authorityName, undefined);
		});

		it('should transform siteAddress object into SiteAddress upsert payload with correct key mapping', () => {
			const input = {
				siteAddress: {
					addressLine1: '1 High St',
					addressLine2: 'Village',
					townCity: 'London',
					county: 'Greater London',
					postcode: 'SW1 1AA'
				}
			};
			const result = mapCasePayload(input);

			const addressUpdate = (result as any).SiteAddress;
			assert.ok(addressUpdate, 'Should have SiteAddress property');

			assert.strictEqual(addressUpdate.upsert.create.line1, '1 High St');
			assert.strictEqual(addressUpdate.upsert.create.townCity, 'London');
			assert.strictEqual(addressUpdate.upsert.create.postcode, 'SW1 1AA');

			assert.strictEqual((result as any).siteAddress, undefined);
		});

		it('should skip applicant transformation if fields are incomplete', () => {
			const input = {};

			const result = mapCasePayload(input);

			assert.strictEqual((result as any).Applicant, undefined);
			assert.strictEqual((result as any).applicantName, undefined);
		});

		it('should transform inspectorDetails into Inspectors deleteMany/create payload', () => {
			const input = {
				inspectorDetails: [
					{ inspectorId: '123', inspectorAllocatedDate: '2025-01-01' },
					{ inspectorId: '456', inspectorAllocatedDate: '2025-02-01' }
				]
			};

			const result = mapCasePayload(input);

			const inspectorsUpdate = (result as any).Inspectors;
			assert.ok(inspectorsUpdate, 'Should have Inspectors property');

			assert.deepStrictEqual(inspectorsUpdate.deleteMany, {});
			assert.strictEqual(inspectorsUpdate.create.length, 2);

			assert.strictEqual(inspectorsUpdate.create[0].Inspector.connectOrCreate.create.idpUserId, '123');
			assert.strictEqual(inspectorsUpdate.create[0].inspectorAllocatedDate, '2025-01-01');

			assert.strictEqual((result as any).inspectorDetails, undefined);
		});

		it('should transform relatedCaseDetails into RelatedCases deleteMany/create payload', () => {
			const input = {
				relatedCaseDetails: [{ relatedCaseReference: 'REF-123' }, { relatedCaseReference: 'REF-456' }]
			};

			const result = mapCasePayload(input);

			const relatedCasesUpdate = (result as any).RelatedCases;
			assert.ok(relatedCasesUpdate, 'Should have RelatedCases property');

			assert.deepStrictEqual(relatedCasesUpdate.deleteMany, {});
			assert.strictEqual(relatedCasesUpdate.create.length, 2);

			assert.strictEqual(relatedCasesUpdate.create[0].reference, 'REF-123');
			assert.strictEqual(relatedCasesUpdate.create[1].reference, 'REF-456');

			assert.strictEqual((result as any).relatedCaseDetails, undefined);
		});

		it('should strip linkedCaseDetails from the payload (handled via direct CaseRelationship writes)', () => {
			const input = {
				linkedCaseDetails: [
					{ linkedCaseId: 'case-id-123', linkedCaseIsLead: 'no' },
					{ linkedCaseId: 'case-id-456', linkedCaseIsLead: 'no' }
				]
			};

			const result = mapCasePayload(input);

			assert.strictEqual((result as any).ChildRelationships, undefined);
			assert.strictEqual((result as any).ParentRelationship, undefined);
			assert.strictEqual((result as any).linkedCaseDetails, undefined);
		});

		it('should transform caseOfficerId into CaseOfficer connectOrCreate payload', () => {
			const input = {
				caseOfficerId: 'officer-456'
			};
			const result = mapCasePayload(input);

			const caseOfficerUpdate = (result as any).CaseOfficer;
			assert.ok(caseOfficerUpdate, 'Should have CaseOfficer property');

			const expectedOfficerConnection = {
				connectOrCreate: {
					where: { idpUserId: 'officer-456' },
					create: { idpUserId: 'officer-456' }
				}
			};

			assert.deepStrictEqual(caseOfficerUpdate, expectedOfficerConnection);

			assert.strictEqual((result as any).caseOfficerId, undefined);
		});

		it('should transform outcomeDetails into Outcome upsert payload with Officer decision maker', () => {
			const input = {
				outcomeDetails: [
					{
						id: 'outcome-1',
						decisionMakerTypeId: 'officer',
						decisionMakerOfficerId: 'officer-123',
						outcomeId: 'allowed',
						outcomeDate: '2025-03-15',
						decisionReceivedDate: '2025-03-16'
					}
				]
			};

			const result = mapCasePayload(input);
			const outcomePayload = (result as any).Outcome;

			assert.ok(outcomePayload);

			assert.deepStrictEqual(outcomePayload.upsert.update.CaseDecisions.deleteMany, { id: { notIn: ['outcome-1'] } });

			const createDecision = outcomePayload.upsert.create.CaseDecisions.create[0];
			assert.strictEqual(createDecision.id, 'outcome-1');
			assert.strictEqual(createDecision.DecisionMaker.connectOrCreate.create.idpUserId, 'officer-123');
			assert.strictEqual(createDecision.Outcome.connect.id, 'allowed');
			assert.deepStrictEqual(createDecision.outcomeDate, new Date('2025-03-15'));
			assert.deepStrictEqual(createDecision.decisionReceivedDate, new Date('2025-03-16'));

			const nestedUpsert = outcomePayload.upsert.update.CaseDecisions.upsert[0];
			assert.strictEqual(nestedUpsert.where.id, 'outcome-1');
			assert.strictEqual(nestedUpsert.update.DecisionMaker.connectOrCreate.create.idpUserId, 'officer-123');

			assert.strictEqual((result as any).outcomeDetails, undefined);
		});

		it('should handle Inspector decision maker correctly', () => {
			const input = {
				outcomeDetails: [
					{
						decisionMakerTypeId: 'inspector',
						decisionMakerInspectorId: 'inspector-999',
						outcomeId: 'dismissed'
					}
				]
			};

			const result = mapCasePayload(input);
			const decision = (result as any).Outcome.upsert.create.CaseDecisions.create[0];

			assert.strictEqual(decision.DecisionMaker.connectOrCreate.create.idpUserId, 'inspector-999');
			assert.strictEqual(decision.Outcome.connect.id, 'dismissed');
		});

		it('should map conditional comments correctly', () => {
			const input = {
				outcomeDetails: [
					{
						grantedWithConditionsComment: 'Conditions applied',
						otherComment: 'Specific reasoning here'
					}
				]
			};

			const result = mapCasePayload(input);
			const decision = (result as any).Outcome.upsert.create.CaseDecisions.create[0];

			assert.strictEqual(decision.grantedWithConditionsComment, 'Conditions applied');
			assert.strictEqual(decision.otherComment, 'Specific reasoning here');
		});

		it('should map multiple decisions if array contains multiple items', () => {
			const input = {
				outcomeDetails: [{ outcomeId: 'outcome-1' }, { outcomeId: 'outcome-2' }]
			};

			const result = mapCasePayload(input);
			const decisions = (result as any).Outcome.upsert.create.CaseDecisions.create;

			assert.strictEqual(decisions.length, 2);
			assert.strictEqual(decisions[0].Outcome.connect.id, 'outcome-1');
			assert.strictEqual(decisions[1].Outcome.connect.id, 'outcome-2');
		});

		it('should ignore outcomeDetails if it is not an array', () => {
			const input = {
				outcomeDetails: 'invalid-string'
			};

			const result = mapCasePayload(input);
			assert.strictEqual((result as any).Outcome, undefined);
		});

		it('should handle adding an Act with a Section', () => {
			const actSection = ACT_SECTIONS[0];
			const input = {
				act: actSection.id
			};

			const result = mapCasePayload(input);
			const act = result.Act;
			const section = result.Section;

			assert.strictEqual(section?.connect?.id, actSection.sectionId);
			assert.strictEqual(act?.connect?.id, actSection.actId);
		});

		it('should handle adding an Act without a Section', () => {
			const input = {
				act: ACT_ID.ELECTRICITY_1989
			};

			const result = mapCasePayload(input);
			const act = result.Act;
			const section = result.Section;

			// Create the connection to the act, make sure to wipe any old connection to section.
			assert.strictEqual(act?.connect?.id, ACT_ID.ELECTRICITY_1989);
			assert.strictEqual(section?.disconnect, true);
		});

		it('should set closedDate if status is being set to a closed one', () => {
			const input = {
				statusId: CASE_STATUS_ID.CLOSED
			};

			const result = mapCasePayload(input);

			assert.ok(result.closedDate instanceof Date);

			// Because closedDate will have been set "now" it might be a few ms or secs off,
			// so just check it's roughly correct.
			const now = new Date().getTime();
			const closedTime = result.closedDate.getTime();
			const differenceInSeconds = (now - closedTime) / 1000;

			assert.ok(differenceInSeconds < 5);
		});

		it('should not set closedDate if status is being set to an open one', () => {
			const input = {
				statusId: CASE_STATUS_ID.ARRANGE_EVENT
			};

			const result = mapCasePayload(input);

			assert.strictEqual(result.closedDate, null);
		});

		it('should set closedDate to null if we have passed null', () => {
			const input = {
				statusId: null
			};

			const result = mapCasePayload(input);

			assert.strictEqual(result.closedDate, null);
		});

		it('closedDate should be undefined if we have passed nothing', () => {
			const input = {};

			const result = mapCasePayload(input);

			assert.strictEqual(result.closedDate, undefined);
		});
	});

	describe('buildUpdateCase (audit recording)', () => {
		it('should record FIELD_UPDATED audit event with display name', async () => {
			let recordedAudit: any = null;

			const mockService = {
				db: {
					$transaction: async (callback: any) =>
						callback({
							case: {
								findUnique: () =>
									Promise.resolve({
										id: 'case-1',
										reference: 'REF-001',
										name: 'Old Name'
									}),
								update: () => Promise.resolve({ id: 'case-1', reference: 'REF-001' })
							}
						})
				},
				audit: {
					recordMany: (entries: any[]) => {
						recordedAudit = entries[0] ?? null;
						return Promise.resolve();
					}
				},
				logger: {
					error: () => {},
					info: () => {}
				},
				entraGroupIds: {
					allUsers: 'mock-group-id',
					caseOfficers: 'mock-group-id',
					inspectors: 'mock-group-id'
				},
				getEntraClient: () => ({
					listAllGroupMembers: async () => [{ id: 'user-123', displayName: 'Test User' }]
				})
			};

			const req = {
				params: { id: 'case-1' },
				session: { account: { localAccountId: 'user-123' } }
			};

			const data = { answers: { name: 'Updated Name' } };

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(recordedAudit.caseId, 'case-1');
			assert.strictEqual(recordedAudit.action, 'FIELD_UPDATED');
			assert.strictEqual(recordedAudit.userId, 'user-123');
			assert.strictEqual(recordedAudit.metadata.fieldName, 'Case name');
			assert.strictEqual(recordedAudit.metadata.oldValue, 'Old Name');
			assert.strictEqual(recordedAudit.metadata.newValue, 'Updated Name');
		});
	});

	describe('mapCasePayload (Procedure Details)', () => {
		it('should transform procedureDetails array into Procedures upsert/deleteMany payload', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-1',
						procedureTypeId: 'hearing',
						procedureStatusId: 'active',
						siteVisitDate: '2025-06-15'
					},
					{
						id: 'proc-2',
						procedureTypeId: 'inquiry',
						procedureStatusId: 'completed'
					}
				]
			};

			const result = mapCasePayload(input);
			const proceduresUpdate = (result as any).Procedures;

			assert.ok(proceduresUpdate);
			assert.deepStrictEqual(proceduresUpdate.deleteMany, { id: { notIn: ['proc-1', 'proc-2'] } });
			assert.strictEqual(proceduresUpdate.upsert.length, 2);

			assert.strictEqual(proceduresUpdate.upsert[0].create.ProcedureType.connect.id, 'hearing');
			assert.strictEqual(proceduresUpdate.upsert[0].create.ProcedureStatus.connect.id, 'active');
			assert.ok(proceduresUpdate.upsert[0].create.siteVisitDate instanceof Date);

			assert.strictEqual(proceduresUpdate.upsert[1].create.ProcedureType.connect.id, 'inquiry');

			assert.strictEqual((result as any).procedureDetails, undefined);
		});

		it('should convert date string fields to Date objects in procedures', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-3',
						procedureTypeId: 'hearing',
						hearingTargetDate: '2025-03-15',
						confirmedHearingDate: '2025-04-01',
						hearingClosedDate: '2025-05-01'
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.ok(proc.hearingTargetDate instanceof Date);
			assert.ok(proc.confirmedHearingDate instanceof Date);
			assert.ok(proc.hearingClosedDate instanceof Date);
		});

		it('should set null for missing optional procedure fields', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-4',
						procedureTypeId: 'hearing',
						procedureStatusId: 'active'
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.strictEqual(proc.siteVisitDate, null);
			assert.strictEqual(proc.hearingTargetDate, null);
			assert.strictEqual(proc.inquiryTargetDate, null);
			assert.strictEqual(proc.inHouseDate, null);
			assert.strictEqual(proc.AdminProcedureType, undefined);
			assert.strictEqual(proc.SiteVisitType, undefined);
		});

		it('should handle inquiry-specific fields in procedure payload', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-5',
						procedureTypeId: 'inquiry',
						inquiryTargetDate: '2025-06-01',
						confirmedInquiryDate: '2025-07-01',
						inquiryFormatId: 'face-to-face'
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.ok(proc.inquiryTargetDate instanceof Date);
			assert.ok(proc.confirmedInquiryDate instanceof Date);
			assert.strictEqual(proc.InquiryFormat.connect.id, 'face-to-face');
		});

		it('should handle admin-specific fields in procedure payload', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-6',
						procedureTypeId: 'admin',
						adminProcedureType: 'case-officer',
						inHouseDate: '2025-03-01'
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.strictEqual(proc.AdminProcedureType.connect.id, 'case-officer');
			assert.ok(proc.inHouseDate instanceof Date);
		});

		it('should ignore procedureDetails if it is not an array', () => {
			const input = {
				procedureDetails: 'invalid-string'
			};

			const result = mapCasePayload(input);
			assert.strictEqual((result as any).Procedures, undefined);
		});

		it('should handle conference and pre-inquiry fields in procedure payload', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-7',
						procedureTypeId: 'inquiry',
						conferenceDate: '2025-04-01',
						conferenceFormatId: 'virtual',
						conferenceNoteSentDate: '2025-04-02',
						preInquiryMeetingDate: '2025-03-15',
						preInquiryMeetingFormatId: 'face-to-face',
						preInquiryNoteSentDate: '2025-03-16',
						inquiryOrConferenceId: 'both'
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.ok(proc.conferenceDate instanceof Date);
			assert.strictEqual(proc.ConferenceFormat.connect.id, 'virtual');
			assert.ok(proc.conferenceNoteSentDate instanceof Date);
			assert.ok(proc.preInquiryMeetingDate instanceof Date);
			assert.strictEqual(proc.PreInquiryMeetingFormat.connect.id, 'face-to-face');
			assert.ok(proc.preInquiryNoteSentDate instanceof Date);
			assert.strictEqual(proc.InquiryOrConference.connect.id, 'both');
		});

		it('should connect relation fields on create and disconnect on update when null', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-9',
						procedureTypeId: 'inquiry',
						conferenceFormatId: null,
						hearingFormatId: 'face-to-face'
					}
				]
			};

			const result = mapCasePayload(input);
			const upsert = (result as any).Procedures.upsert[0];

			// Update should disconnect null relations
			assert.deepStrictEqual(upsert.update.ConferenceFormat, { disconnect: true });
			// Update should connect provided relations
			assert.deepStrictEqual(upsert.update.HearingFormat, { connect: { id: 'face-to-face' } });

			// Create should only have connect, no disconnect
			assert.strictEqual(upsert.create.ConferenceFormat, undefined);
			assert.deepStrictEqual(upsert.create.HearingFormat, { connect: { id: 'face-to-face' } });
		});

		it('should handle written reps fields in procedure payload', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-8',
						procedureTypeId: 'written-reps',
						offerForWrittenRepresentationsDate: '2025-05-01'
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.ok(proc.offerForWrittenRepresentationsDate instanceof Date);
		});

		it('should transform hearingVenue into HearingVenue create payload within procedures', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-1',
						hearingVenue: {
							addressLine1: '1 Hearing St',
							addressLine2: 'Floor 2',
							townCity: 'Bristol',
							county: 'Avon',
							postcode: 'BS1 1AA'
						}
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.ok(proc.HearingVenue, 'Should have HearingVenue property');
			assert.strictEqual(proc.HearingVenue.create.line1, '1 Hearing St');
			assert.strictEqual(proc.HearingVenue.create.line2, 'Floor 2');
			assert.strictEqual(proc.HearingVenue.create.townCity, 'Bristol');
			assert.strictEqual(proc.HearingVenue.create.county, 'Avon');
			assert.strictEqual(proc.HearingVenue.create.postcode, 'BS1 1AA');
		});

		it('should transform inquiryVenue into InquiryVenue create payload within procedures', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-1',
						inquiryVenue: {
							addressLine1: '1 Inquiry St',
							townCity: 'London',
							postcode: 'SW1 1AA'
						}
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.ok(proc.InquiryVenue, 'Should have InquiryVenue property');
			assert.strictEqual(proc.InquiryVenue.create.line1, '1 Inquiry St');
			assert.strictEqual(proc.InquiryVenue.create.townCity, 'London');
			assert.strictEqual(proc.InquiryVenue.create.postcode, 'SW1 1AA');
		});

		it('should transform conferenceVenue into ConferenceVenue create payload within procedures', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-1',
						conferenceVenue: {
							addressLine1: '1 Conf St',
							townCity: 'Manchester',
							postcode: 'M1 1AA'
						}
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.ok(proc.ConferenceVenue, 'Should have ConferenceVenue property');
			assert.strictEqual(proc.ConferenceVenue.create.line1, '1 Conf St');
			assert.strictEqual(proc.ConferenceVenue.create.townCity, 'Manchester');
			assert.strictEqual(proc.ConferenceVenue.create.postcode, 'M1 1AA');
		});

		it('should handle decimal columns being passed an empty string by converting to null', () => {
			const input = {
				procedureDetails: [
					{
						id: 'proc-1',
						hearingSittingTimeDays: ''
					}
				]
			};

			const result = mapCasePayload(input);
			const proc = (result as any).Procedures.upsert[0].create;

			assert.strictEqual(proc.hearingSittingTimeDays, null);
		});
	});

	describe('buildUpdateCase (procedure updates)', () => {
		it('should save procedure details when procedureDetails is in answers', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = {
				answers: {
					procedureDetails: [
						{
							id: 'proc-123',
							procedureTypeId: 'hearing',
							procedureStatusId: 'active'
						}
					]
				}
			};

			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			const handler = buildUpdateCase(mockService as any);
			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);

			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			const proceduresPayload = updateArgs.data.Procedures;

			assert.ok(proceduresPayload, 'Should have Procedures in update payload');

			assert.deepStrictEqual(proceduresPayload.deleteMany, { id: { notIn: ['proc-123'] } });

			assert.strictEqual(proceduresPayload.upsert.length, 1);
			assert.strictEqual(proceduresPayload.upsert[0].create.ProcedureType.connect.id, 'hearing');
		});
	});

	describe('handleAbeyancePeriod', () => {
		it('should map abeyancePeriod to Abeyance upsert', () => {
			const flatData: Record<string, unknown> = {
				abeyancePeriod: {
					start: '2026-11-10T00:00:00.000Z',
					end: '2026-12-10T00:00:00.000Z'
				}
			};
			const prismaPayload: any = {};

			handleAbeyancePeriod(flatData, prismaPayload);

			assert.deepStrictEqual(prismaPayload.Abeyance, {
				upsert: {
					create: {
						abeyanceStartDate: new Date('2026-11-10T00:00:00.000Z'),
						abeyanceEndDate: new Date('2026-12-10T00:00:00.000Z')
					},
					update: {
						abeyanceStartDate: new Date('2026-11-10T00:00:00.000Z'),
						abeyanceEndDate: new Date('2026-12-10T00:00:00.000Z')
					}
				}
			});
			assert.strictEqual(flatData.abeyancePeriod, undefined);
		});

		it('should handle null end date', () => {
			const flatData: Record<string, unknown> = {
				abeyancePeriod: {
					start: '2026-11-10T00:00:00.000Z',
					end: null
				}
			};
			const prismaPayload: any = {};

			handleAbeyancePeriod(flatData, prismaPayload);

			assert.strictEqual(prismaPayload.Abeyance.upsert.create.abeyanceEndDate, null);
			assert.ok(prismaPayload.Abeyance.upsert.create.abeyanceStartDate instanceof Date);
		});

		it('should handle Invalid Date end date', () => {
			const flatData: Record<string, unknown> = {
				abeyancePeriod: {
					start: '2026-11-10T00:00:00.000Z',
					end: new Date('invalid')
				}
			};
			const prismaPayload: any = {};

			handleAbeyancePeriod(flatData, prismaPayload);

			assert.strictEqual(prismaPayload.Abeyance.upsert.create.abeyanceEndDate, null);
		});

		it('should not modify prismaPayload when abeyancePeriod is not present', () => {
			const flatData: Record<string, unknown> = { someOtherField: 'value' };
			const prismaPayload: any = {};

			handleAbeyancePeriod(flatData, prismaPayload);

			assert.strictEqual(prismaPayload.Abeyance, undefined);
		});

		it('should handle null abeyancePeriod', () => {
			const flatData: Record<string, unknown> = { abeyancePeriod: null };
			const prismaPayload: any = {};

			handleAbeyancePeriod(flatData, prismaPayload);

			assert.strictEqual(prismaPayload.Abeyance.upsert.create.abeyanceStartDate, null);
			assert.strictEqual(prismaPayload.Abeyance.upsert.create.abeyanceEndDate, null);
		});
	});

	describe('clearAndUpdateCase - empty submissions', () => {
		it('should clear field to null when undefined (absent from answers)', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { description: undefined } };

			const handler = buildUpdateCase(mockService as any, true);
			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.data.description, null);
		});

		it('should clear field to null when null value is submitted', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { description: null } };

			const handler = buildUpdateCase(mockService as any, true);
			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.data.description, null);
		});

		it('should clear field to null when empty string is submitted', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { description: '' } };

			const handler = buildUpdateCase(mockService as any, true);
			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.data.description, null);
		});

		it('should clear field to null when empty array is submitted', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { tags: [] } };

			const handler = buildUpdateCase(mockService as any, true);
			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.data.tags, null);
		});

		it('should clear field to null when array with falsy values is submitted', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { tags: [null, undefined, ''] } };

			const handler = buildUpdateCase(mockService as any, true);
			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.data.tags, null);
		});

		it('should clear date field to null when date sub-fields are all empty', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { hearingClosedDate: null } };

			const handler = buildUpdateCase(mockService as any, true);
			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.data.hearingClosedDate, null);
		});

		it('should clear whitespace-only strings to null', async () => {
			const req = { params: { id: 'case-123' }, session: {} };
			const data = { answers: { description: '   ' } };

			const handler = buildUpdateCase(mockService as any, true);
			mockFindUnique.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);
			mockUpdate.mock.mockImplementationOnce(() => ({ id: 'case-123', reference: 'REF-001' }) as any);

			await handler({ req: req as any, res: {} as any, data });

			assert.strictEqual(mockUpdate.mock.callCount(), 1);
			const updateArgs = mockUpdate.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.data.description, null);
		});
	});
});
