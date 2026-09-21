// @ts-nocheck
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
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
const mockCaseCreate = mock.fn(() => Promise.resolve({ id: 'case-123', reference: 'ROW/10001' }));
const mockCaseRelationshipDeleteMany = mock.fn(() => Promise.resolve());
const mockCaseRelationshipCreateMany = mock.fn(() => Promise.resolve());
const mockCaseRelationshipCreate = mock.fn(() => Promise.resolve());
const mockFolderCreate = mock.fn(() => Promise.resolve());

const mockTx = {
	case: {
		findFirst: mockCaseFindFirst,
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

const mockAuditRecord = mock.fn(() => Promise.resolve());

const mockService = {
	db: mockDb as any,
	logger: mockLogger(),
	audit: {
		record: mockAuditRecord
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
		mockCaseCreate.mock.resetCalls();
		mockCaseRelationshipDeleteMany.mock.resetCalls();
		mockCaseRelationshipCreateMany.mock.resetCalls();
		mockCaseRelationshipCreate.mock.resetCalls();
		mockFolderCreate.mock.resetCalls();
		mockDbTransaction.mock.resetCalls();
		mockAuditRecord.mock.resetCalls();
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
		});

		it('should not write case relationships when this case is the lead case', async () => {
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
			assert.strictEqual((res as any).redirect.mock.calls.length, 0);
		});
	});
});
