// @ts-nocheck
import { mockLogger } from '@planning-inspectorate/core/testing';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { AUDIT_ACTIONS } from '../../../audit/index.ts';
import { buildSaveController } from './save.ts';

const getBaseAnswers = (): Record<string, unknown> => ({
	name: 'Test Case',
	receivedDate: new Date('2026-01-01'),
	externalReference: 'EXT-123',
	caseOfficerId: 'officer-xyz',
	location: 'London',
	caseworkArea: 'rights-of-way',
	rightsOfWay: 'rights-of-way',
	applicantDetails: []
});

const mockCaseFindFirst = mock.fn(() => Promise.resolve(null));
const mockCaseFindUnique = mock.fn(() => Promise.resolve({ reference: 'HOU/2025/1059', ChildRelationships: [] }));
const mockCaseCreate = mock.fn(() => Promise.resolve({ id: 'case-123', reference: 'ROW/10001' }));
const mockCaseRelationshipDeleteMany = mock.fn(() => Promise.resolve());
const mockCaseRelationshipCreateMany = mock.fn(() => Promise.resolve());
const mockCaseRelationshipCreate = mock.fn(() => Promise.resolve());
const mockFolderCreate = mock.fn(() => Promise.resolve());

const mockTx = {
	case: {
		findFirst: mockCaseFindFirst,
		findUnique: mockCaseFindUnique,
		create: mockCaseCreate
	},
	caseRelationship: {
		deleteMany: mockCaseRelationshipDeleteMany,
		createMany: mockCaseRelationshipCreateMany,
		create: mockCaseRelationshipCreate
	},
	folder: {
		create: mockFolderCreate
	}
};

const mockDbTransaction = mock.fn(async (callback) => callback(mockTx));

const mockDb = {
	$transaction: mockDbTransaction
};

const auditCallOrder: string[] = [];
const mockAuditRecord = mock.fn(() => {
	auditCallOrder.push('record');
	return Promise.resolve();
});
const mockAuditRecordMany = mock.fn(() => {
	auditCallOrder.push('recordMany');
	return Promise.resolve();
});

const mockService = {
	db: mockDb as any,
	logger: mockLogger(),
	audit: {
		record: mockAuditRecord,
		recordMany: mockAuditRecordMany
	}
};

const buildReq = () => ({
	baseUrl: '/cases/create-a-case',
	session: { account: { localAccountId: 'user-abc' } }
});

const buildRes = (answers: Record<string, unknown>) => ({
	locals: { journeyResponse: { answers } },
	redirect: mock.fn()
});

describe('buildSaveController', () => {
	beforeEach(() => {
		mockCaseFindFirst.mock.resetCalls();
		mockCaseFindUnique.mock.resetCalls();
		mockCaseFindUnique.mock.mockImplementation(() =>
			Promise.resolve({ reference: 'HOU/2025/1059', ChildRelationships: [] })
		);
		mockCaseCreate.mock.resetCalls();
		mockCaseRelationshipDeleteMany.mock.resetCalls();
		mockCaseRelationshipCreateMany.mock.resetCalls();
		mockCaseRelationshipCreate.mock.resetCalls();
		mockFolderCreate.mock.resetCalls();
		mockDbTransaction.mock.resetCalls();
		mockAuditRecord.mock.resetCalls();
		mockAuditRecordMany.mock.resetCalls();
		auditCallOrder.length = 0;
	});

	describe('end-to-end', () => {
		it('should throw if res.locals is missing', async () => {
			const controller = buildSaveController({ db: {}, logger: {} });
			await assert.rejects(async () => controller({} as any, {} as any), {
				message: 'Valid journey response and answers object required'
			});
		});

		it('should throw if res.locals.journeyResponse is missing', async () => {
			const controller = buildSaveController({ db: {}, logger: {} });
			await assert.rejects(async () => controller({} as any, { locals: {} } as any), {
				message: 'Valid journey response and answers object required'
			});
		});

		it('should throw if answers is not an object', async () => {
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: 'not-an-object'
					}
				}
			};
			const controller = buildSaveController({ db: {}, logger: {} });
			await assert.rejects(async () => controller({} as any, mockRes as any), {
				message: 'Valid journey response and answers object required'
			});
		});
	});

	describe('happy path', () => {
		it('should create the case, record an audit event, clear the session and redirect to success', async () => {
			const answers = getBaseAnswers();
			const req = buildReq();
			const res = buildRes(answers);

			const controller = buildSaveController(mockService as any);
			await controller(req as any, res as any);

			assert.strictEqual(mockCaseCreate.mock.calls.length, 1);
			assert.strictEqual(mockAuditRecord.mock.calls.length, 1);
			assert.deepStrictEqual(mockAuditRecord.mock.calls[0].arguments[0], {
				caseId: 'case-123',
				action: AUDIT_ACTIONS.CASE_CREATED,
				userId: 'user-abc',
				metadata: { reference: 'ROW/10001' }
			});
			assert.strictEqual(mockAuditRecordMany.mock.calls.length, 0);

			assert.deepStrictEqual((req as any).session.forms['create-a-case'], { id: 'case-123', reference: 'ROW/10001' });
			assert.strictEqual((res as any).redirect.mock.calls.length, 1);
			assert.strictEqual((res as any).redirect.mock.calls[0].arguments[0], '/cases/create-a-case/success');
		});

		it('should not write any case relationships when hasLinkedCases is not YES', async () => {
			const answers = getBaseAnswers();
			const req = buildReq();
			const res = buildRes(answers);

			const controller = buildSaveController(mockService as any);
			await controller(req as any, res as any);

			assert.strictEqual(mockCaseRelationshipDeleteMany.mock.calls.length, 0);
			assert.strictEqual(mockCaseRelationshipCreateMany.mock.calls.length, 0);
			assert.strictEqual(mockCaseRelationshipCreate.mock.calls.length, 0);
		});
	});

	describe('linked case relationships', () => {
		it('should append a single relationship linking the new case to the lead case, without wiping any existing relationships', async () => {
			const answers = {
				...getBaseAnswers(),
				hasLinkedCases: BOOLEAN_OPTIONS.YES,
				isLeadCase: BOOLEAN_OPTIONS.NO,
				leadCaseId: 'lead-case-456'
			};
			const req = buildReq();
			const res = buildRes(answers);

			const controller = buildSaveController(mockService as any);
			await controller(req as any, res as any);

			assert.strictEqual(mockCaseRelationshipDeleteMany.mock.calls.length, 0);
			assert.strictEqual(mockCaseRelationshipCreateMany.mock.calls.length, 0);
			assert.strictEqual(mockCaseRelationshipCreate.mock.calls.length, 1);
			assert.deepStrictEqual(mockCaseRelationshipCreate.mock.calls[0].arguments[0], {
				data: { parentCaseId: 'lead-case-456', childCaseId: 'case-123' }
			});

			assert.strictEqual(mockCaseFindUnique.mock.calls.length, 1);
			assert.deepStrictEqual(mockCaseFindUnique.mock.calls[0].arguments[0], {
				where: { id: 'lead-case-456' },
				select: {
					reference: true,
					ChildRelationships: { select: { ChildCase: { select: { id: true, reference: true } } } }
				}
			});

			// The lead case had no existing children before this, so it wasn't part of
			// any "real" prior group either - both it and the new case are ADDED to the
			// newly-formed group, consistent with how the edit journey treats a
			// previously-standalone case (see resolveLinkedCaseAudits).
			const newSnapshot = [
				{ reference: 'ROW/10001', isLead: false },
				{ reference: 'HOU/2025/1059', isLead: true }
			];

			// CASE_CREATED must be recorded via its own record() call, strictly before
			// the linked-case entries' recordMany() call, so it can't tie on createdAt
			// with (and be sorted arbitrarily relative to) the linked-case entries.
			assert.deepStrictEqual(auditCallOrder, ['record', 'recordMany']);

			assert.strictEqual(mockAuditRecord.mock.calls.length, 1);
			assert.deepStrictEqual(mockAuditRecord.mock.calls[0].arguments[0], {
				caseId: 'case-123',
				action: AUDIT_ACTIONS.CASE_CREATED,
				userId: 'user-abc',
				metadata: { reference: 'ROW/10001' }
			});

			assert.strictEqual(mockAuditRecordMany.mock.calls.length, 1);
			assert.deepStrictEqual(mockAuditRecordMany.mock.calls[0].arguments[0], [
				{
					caseId: 'case-123',
					action: AUDIT_ACTIONS.LINKED_CASE_GROUP_ADDED,
					userId: 'user-abc',
					metadata: { fieldName: 'linked cases', newLinkedCases: newSnapshot }
				},
				{
					caseId: 'lead-case-456',
					action: AUDIT_ACTIONS.LINKED_CASE_GROUP_ADDED,
					userId: 'user-abc',
					metadata: { fieldName: 'linked cases', newLinkedCases: newSnapshot }
				}
			]);
		});

		it('should record a LINKED_CASE_GROUP_UPDATED entry for the lead and existing siblings when the lead already has children', async () => {
			mockCaseFindUnique.mock.mockImplementation(() =>
				Promise.resolve({
					reference: 'HOU/2025/1059',
					ChildRelationships: [{ ChildCase: { id: 'sibling-1', reference: 'HOU/2025/1060' } }]
				})
			);

			const answers = {
				...getBaseAnswers(),
				hasLinkedCases: BOOLEAN_OPTIONS.YES,
				isLeadCase: BOOLEAN_OPTIONS.NO,
				leadCaseId: 'lead-case-456'
			};
			const req = buildReq();
			const res = buildRes(answers);

			const controller = buildSaveController(mockService as any);
			await controller(req as any, res as any);

			const oldSnapshot = [
				{ reference: 'HOU/2025/1059', isLead: true },
				{ reference: 'HOU/2025/1060', isLead: false }
			];
			const newSnapshot = [
				{ reference: 'ROW/10001', isLead: false },
				{ reference: 'HOU/2025/1059', isLead: true },
				{ reference: 'HOU/2025/1060', isLead: false }
			];

			assert.deepStrictEqual(auditCallOrder, ['record', 'recordMany']);

			assert.deepStrictEqual(mockAuditRecord.mock.calls[0].arguments[0], {
				caseId: 'case-123',
				action: AUDIT_ACTIONS.CASE_CREATED,
				userId: 'user-abc',
				metadata: { reference: 'ROW/10001' }
			});

			assert.deepStrictEqual(mockAuditRecordMany.mock.calls[0].arguments[0], [
				{
					caseId: 'case-123',
					action: AUDIT_ACTIONS.LINKED_CASE_GROUP_ADDED,
					userId: 'user-abc',
					metadata: { fieldName: 'linked cases', newLinkedCases: newSnapshot }
				},
				{
					caseId: 'lead-case-456',
					action: AUDIT_ACTIONS.LINKED_CASE_GROUP_UPDATED,
					userId: 'user-abc',
					metadata: { fieldName: 'linked cases', oldLinkedCases: oldSnapshot, newLinkedCases: newSnapshot }
				},
				{
					caseId: 'sibling-1',
					action: AUDIT_ACTIONS.LINKED_CASE_GROUP_UPDATED,
					userId: 'user-abc',
					metadata: { fieldName: 'linked cases', oldLinkedCases: oldSnapshot, newLinkedCases: newSnapshot }
				}
			]);
		});

		it('should not record linked case group audits when this case is the lead case', async () => {
			const answers = {
				...getBaseAnswers(),
				hasLinkedCases: BOOLEAN_OPTIONS.YES,
				isLeadCase: BOOLEAN_OPTIONS.YES,
				leadCaseId: null
			};
			const req = buildReq();
			const res = buildRes(answers);

			const controller = buildSaveController(mockService as any);
			await controller(req as any, res as any);

			assert.strictEqual(mockCaseRelationshipDeleteMany.mock.calls.length, 0);
			assert.strictEqual(mockCaseRelationshipCreateMany.mock.calls.length, 0);
			assert.strictEqual(mockCaseRelationshipCreate.mock.calls.length, 0);
		});

		it('should not write case relationships when hasLinkedCases is YES but there is no leadCaseId', async () => {
			const answers = {
				...getBaseAnswers(),
				hasLinkedCases: BOOLEAN_OPTIONS.YES,
				isLeadCase: BOOLEAN_OPTIONS.NO,
				leadCaseId: null
			};
			const req = buildReq();
			const res = buildRes(answers);

			const controller = buildSaveController(mockService as any);
			await controller(req as any, res as any);

			assert.strictEqual(mockCaseRelationshipDeleteMany.mock.calls.length, 0);
			assert.strictEqual(mockCaseRelationshipCreateMany.mock.calls.length, 0);
			assert.strictEqual(mockCaseRelationshipCreate.mock.calls.length, 0);
		});
	});

	describe('error handling', () => {
		it('should propagate the error, without recording an audit event or redirecting, when the transaction fails', async () => {
			const answers = getBaseAnswers();
			const req = buildReq();
			const res = buildRes(answers);

			const failingDb = {
				$transaction: mock.fn(() => Promise.reject(new Error('db is down')))
			};
			const controller = buildSaveController({ ...mockService, db: failingDb } as any);

			await assert.rejects(async () => controller(req as any, res as any), { message: 'db is down' });

			assert.strictEqual(mockAuditRecord.mock.calls.length, 0);
			assert.strictEqual(mockAuditRecordMany.mock.calls.length, 0);
			assert.strictEqual((res as any).redirect.mock.calls.length, 0);
		});
	});
});
