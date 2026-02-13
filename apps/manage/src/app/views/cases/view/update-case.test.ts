import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildUpdateCase, mapCasePayload } from './update-case.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';

const mockFindUnique = mock.fn();
const mockUpdate = mock.fn();

const mockTx = {
	case: {
		findUnique: mockFindUnique,
		update: mockUpdate
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
		record: mock.fn(() => Promise.resolve())
	}
};

describe('Update Case Controller', () => {
	beforeEach(() => {
		// Reset mocks before each test
		mockFindUnique.mock.resetCalls();
		mockUpdate.mock.resetCalls();
		mockDbTransaction.mock.resetCalls();
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
			assert.ok(updateArgs.data.updatedDate instanceof Date, 'Should set updatedDate');
		});

		it('should throw "Case not found" if case does not exist', async () => {
			const req = { params: { id: 'missing-case' } };
			const data = { answers: { name: 'Val' } };

			mockFindUnique.mock.mockImplementationOnce(() => null as any);

			const handler = buildUpdateCase(mockService as any);

			await assert.rejects(() => handler({ req: req as any, res: {} as any, data }), { message: 'Case not found' });

			assert.strictEqual(mockUpdate.mock.callCount(), 0);
		});
	});

	describe('mapCasePayload (Transformation Logic)', () => {
		it('should keep main table fields at root level', () => {
			const input = { name: 'My Case', reference: 'REF001' };
			const result = mapCasePayload(input, 'case-123');

			assert.strictEqual(result.name, 'My Case');
			assert.strictEqual(result.reference, 'REF001');
			assert.strictEqual((result as any).Dates, undefined);
		});

		it('should nest Date fields into "Dates" upsert object', () => {
			const input = { startDate: '2025-01-01', expiryDate: '2025-12-31' };
			const result = mapCasePayload(input, 'case-123');

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
			const result = mapCasePayload(input, 'case-123');

			assert.strictEqual(result.name, 'Main Field');
			assert.strictEqual((result as any).Dates.upsert.create.startDate, '2025-01-01');
		});

		it('should transform applicant fields into Applicant upsert payload', () => {
			const input = {
				applicantName: 'John Doe'
			};
			const result = mapCasePayload(input, 'case-123');

			const applicantUpdate = (result as any).Applicant;
			assert.ok(applicantUpdate, 'Should have Applicant property');

			assert.strictEqual(applicantUpdate.upsert.create.name, 'John Doe');

			assert.strictEqual((result as any).applicantName, undefined);
		});

		it('should transform authority fields into Authority upsert payload', () => {
			const input = {
				authorityName: 'Local Council'
			};
			const result = mapCasePayload(input, 'case-123');

			const authorityUpdate = (result as any).Authority;
			assert.ok(authorityUpdate, 'Should have Authority property');

			assert.strictEqual(authorityUpdate.upsert.create.name, 'Local Council');

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
			const result = mapCasePayload(input, 'case-123');

			const addressUpdate = (result as any).SiteAddress;
			assert.ok(addressUpdate, 'Should have SiteAddress property');

			assert.strictEqual(addressUpdate.upsert.create.line1, '1 High St');
			assert.strictEqual(addressUpdate.upsert.create.townCity, 'London');
			assert.strictEqual(addressUpdate.upsert.create.postcode, 'SW1 1AA');

			assert.strictEqual((result as any).siteAddress, undefined);
		});

		it('should skip applicant transformation if fields are incomplete', () => {
			const input = {};

			const result = mapCasePayload(input, 'case-123');

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

			const result = mapCasePayload(input, 'case-123');

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

			const result = mapCasePayload(input, 'case-123');

			const relatedCasesUpdate = (result as any).RelatedCases;
			assert.ok(relatedCasesUpdate, 'Should have RelatedCases property');

			assert.deepStrictEqual(relatedCasesUpdate.deleteMany, {});
			assert.strictEqual(relatedCasesUpdate.create.length, 2);

			assert.strictEqual(relatedCasesUpdate.create[0].reference, 'REF-123');
			assert.strictEqual(relatedCasesUpdate.create[1].reference, 'REF-456');

			assert.strictEqual((result as any).relatedCaseDetails, undefined);
		});

		it('should transform linkedCaseDetails into RelatedCases deleteMany/create payload', () => {
			const input = {
				linkedCaseDetails: [
					{ linkedCaseReference: 'REF-123', linkedCaseIsLead: 'yes' },
					{ linkedCaseReference: 'REF-456', linkedCaseIsLead: 'yes' }
				]
			};

			const result = mapCasePayload(input, 'case-123');

			const linkedCaseUpdate = (result as any).LinkedCases;
			assert.ok(linkedCaseUpdate, 'Should have LinkedCases property');

			assert.deepStrictEqual(linkedCaseUpdate.deleteMany, {});
			assert.strictEqual(linkedCaseUpdate.create.length, 2);

			assert.strictEqual(linkedCaseUpdate.create[0].reference, 'REF-123');
			assert.strictEqual(linkedCaseUpdate.create[1].reference, 'REF-456');

			assert.strictEqual(linkedCaseUpdate.create[0].isLead, true);
			assert.strictEqual(linkedCaseUpdate.create[1].isLead, true);

			assert.strictEqual((result as any).linkedCaseDetails, undefined);
		});

		it('should transform decisionMakerId into Decision.DecisionMaker connectOrCreate payload', () => {
			const input = {
				decisionMakerId: 'user-auth0-123'
			};
			const result = mapCasePayload(input, 'case-123');

			const decisionUpdate = (result as any).Decision;
			assert.ok(decisionUpdate, 'Should have Decision property');
			assert.ok(decisionUpdate.upsert, 'Should be an upsert');

			const expectedUserConnection = {
				connectOrCreate: {
					where: { idpUserId: 'user-auth0-123' },
					create: { idpUserId: 'user-auth0-123' }
				}
			};

			assert.deepStrictEqual(decisionUpdate.upsert.create.DecisionMaker, expectedUserConnection);
			assert.deepStrictEqual(decisionUpdate.upsert.update.DecisionMaker, expectedUserConnection);

			assert.strictEqual((result as any).decisionMakerId, undefined);
		});

		it('should transform caseOfficerId into CaseOfficer connectOrCreate payload', () => {
			const input = {
				caseOfficerId: 'officer-456'
			};
			const result = mapCasePayload(input, 'case-123');

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

		it('should handle decisionMakerId merging with existing Decision updates', () => {
			const input = {
				decisionDate: '2025-05-01',
				decisionMakerId: 'user-789'
			};
			const result = mapCasePayload(input, 'case-123');

			const decisionUpdate = (result as any).Decision;

			assert.strictEqual(decisionUpdate.upsert.create.DecisionMaker.connectOrCreate.where.idpUserId, 'user-789');
			assert.strictEqual(decisionUpdate.upsert.update.DecisionMaker.connectOrCreate.where.idpUserId, 'user-789');
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
								findUnique: () => Promise.resolve({ id: 'case-1', reference: 'REF-001' }),
								update: () => Promise.resolve({ id: 'case-1', reference: 'REF-001' })
							}
						})
				},
				audit: {
					record: (entry: any) => {
						recordedAudit = entry;
						return Promise.resolve();
					}
				},
				logger: {
					error: () => {},
					info: () => {}
				}
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
			assert.deepStrictEqual(recordedAudit.metadata, { fieldName: 'Case name' });
		});
	});
});
