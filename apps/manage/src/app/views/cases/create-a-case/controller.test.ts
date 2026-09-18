import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { buildGetJourneyMiddleware } from './controller.ts';

describe('buildGetJourneyMiddleware', () => {
	const mockLogger = {
		info: mock.fn(),
		error: mock.fn(),
		warn: mock.fn()
	} as any;

	const mockDb = {
		case: { findMany: mock.fn() }
	} as any;

	const getEntraClient = mock.fn(() => null);

	const service = {
		logger: mockLogger,
		db: mockDb,
		getEntraClient,
		entraGroupIds: { allUsers: 'all', caseOfficers: 'officers', inspectors: 'inspectors' }
	} as any;

	const mockReq = (overrides = {}) => ({ session: {}, ...overrides }) as any;

	beforeEach(() => {
		mockDb.case.findMany.mock.resetCalls();
		mockDb.case.findMany.mock.mockImplementation(() => Promise.resolve([]));
		mockLogger.error.mock.resetCalls();
		mockLogger.info.mock.resetCalls();
		mockLogger.warn.mock.resetCalls();
		getEntraClient.mock.resetCalls();
		getEntraClient.mock.mockImplementation(() => null);
	});

	describe('otherCases', () => {
		it('should populate req.otherCases from db.case.findMany on success', async () => {
			const otherCases = [
				{ id: 'case-1', reference: 'REF-001' },
				{ id: 'case-2', reference: 'REF-002' }
			];
			mockDb.case.findMany.mock.mockImplementation(() => Promise.resolve(otherCases));

			const req = mockReq();
			const next = mock.fn();

			await buildGetJourneyMiddleware(service)(req, {} as any, next);

			assert.strictEqual(mockDb.case.findMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.case.findMany.mock.calls[0].arguments[0], {
				select: { id: true, reference: true },
				orderBy: { reference: 'asc' }
			});
			assert.deepStrictEqual(req.otherCases, otherCases);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('should set req.otherCases to an empty array when there are no other cases', async () => {
			mockDb.case.findMany.mock.mockImplementation(() => Promise.resolve([]));

			const req = mockReq();
			const next = mock.fn();

			await buildGetJourneyMiddleware(service)(req, {} as any, next);

			assert.deepStrictEqual(req.otherCases, []);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('should fall back to an empty array and log an error when the DB call fails', async () => {
			const dbError = new Error('Connection lost');
			mockDb.case.findMany.mock.mockImplementation(() => Promise.reject(dbError));

			const req = mockReq();
			const next = mock.fn();

			await buildGetJourneyMiddleware(service)(req, {} as any, next);

			assert.deepStrictEqual(req.otherCases, []);
			assert.strictEqual(mockLogger.error.mock.callCount(), 1);
			assert.deepStrictEqual(mockLogger.error.mock.calls[0].arguments[0], { error: dbError });
			assert.strictEqual(mockLogger.error.mock.calls[0].arguments[1], 'Failed to fetch other cases');
			assert.strictEqual(next.mock.callCount(), 1);
		});
	});

	describe('groupMembers', () => {
		it('should populate req.groupMembers from the entra client when available', async () => {
			const membersByGroupId: Record<string, string[]> = {
				all: ['user-1', 'user-2'],
				officers: ['officer-1'],
				inspectors: ['inspector-1']
			};
			const listAllGroupMembers = mock.fn((groupId: string) => Promise.resolve(membersByGroupId[groupId]));
			getEntraClient.mock.mockImplementation(() => ({ listAllGroupMembers }) as any);

			const req = mockReq();
			const next = mock.fn();

			await buildGetJourneyMiddleware(service)(req, {} as any, next);

			assert.deepStrictEqual(req.groupMembers, {
				allUsers: ['user-1', 'user-2'],
				caseOfficers: ['officer-1'],
				inspectors: ['inspector-1']
			});
			assert.strictEqual(listAllGroupMembers.mock.callCount(), 3);
			assert.deepStrictEqual(
				listAllGroupMembers.mock.calls.map((call) => call.arguments[0]),
				['all', 'officers', 'inspectors']
			);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('should set req.groupMembers to empty defaults when no entra client is available', async () => {
			const req = mockReq();
			const next = mock.fn();

			await buildGetJourneyMiddleware(service)(req, {} as any, next);

			assert.deepStrictEqual(req.groupMembers, { allUsers: [], caseOfficers: [], inspectors: [] });
			assert.strictEqual(mockLogger.error.mock.callCount(), 0);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('should log an error and leave req.groupMembers unset when fetching group members fails', async () => {
			const entraError = new Error('Graph API unavailable');
			const listAllGroupMembers = mock.fn(() => Promise.reject(entraError));
			getEntraClient.mock.mockImplementation(() => ({ listAllGroupMembers }) as any);

			const req = mockReq();
			const next = mock.fn();

			await buildGetJourneyMiddleware(service)(req, {} as any, next);

			assert.strictEqual(req.groupMembers, undefined);
			assert.strictEqual(mockLogger.error.mock.callCount(), 1);
			assert.deepStrictEqual(mockLogger.error.mock.calls[0].arguments[0], { error: entraError });
			assert.strictEqual(mockLogger.error.mock.calls[0].arguments[1], 'Failed to fetch entra group members');
			assert.strictEqual(next.mock.callCount(), 1);
		});
	});
});
