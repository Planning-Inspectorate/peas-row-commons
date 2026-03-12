import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildViewCaseDetails,
	validateIdFormat,
	buildGetJourneyMiddleware,
	combineSessionAndDbData
} from './controller.ts';
import * as entraGroups from '#util/entra-groups.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';

describe('Case Controller', () => {
	const newMockRes = () => ({
		locals: {},
		render: mock.fn(),
		status: mock.fn(() => ({ send: mock.fn() }))
	});

	const mockNext = mock.fn();

	describe('validateIdFormat', () => {
		it('should throw if no id param', () => {
			const mockReq = { params: {}, session: {} };
			const mockRes = newMockRes();

			assert.throws(() => validateIdFormat(mockReq as any, mockRes as any, mockNext), {
				message: 'id param required'
			});
		});

		it('should call next() if id is a valid UUID', () => {
			const mockReq = { params: { id: '00000000-0000-0000-0000-000000000001' }, session: {} };
			const mockRes = newMockRes();
			const next = mock.fn();

			validateIdFormat(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('should not call next() if id is invalid', () => {
			const mockReq = { params: { id: 'invalid-id-string' }, session: {} };
			const mockRes = newMockRes();
			const next = mock.fn();

			try {
				validateIdFormat(mockReq as any, mockRes as any, next);
			} catch (e) {
				// Ignore errors from the real notFoundHandler if it tries to render
			}

			assert.strictEqual(next.mock.callCount(), 0);
		});
	});

	describe('buildViewCaseDetails', () => {
		it('should throw if no id param', async () => {
			const mockReq = { params: {}, session: {} };
			const mockRes = newMockRes();
			const handler = buildViewCaseDetails();

			await assert.rejects(() => handler(mockReq as any, mockRes as any, mockNext), {
				message: 'id param required'
			});
		});
	});

	describe('buildGetJourneyMiddleware', () => {
		const mockDb = {
			case: {
				findUnique: mock.fn()
			},
			user: {
				findMany: mock.fn()
			},
			$transaction: mock.fn(async (promises) => Promise.all(promises))
		};

		const mockService = {
			db: mockDb,
			logger: mockLogger(),
			authConfig: {
				groups: []
			},
			getEntraClient: () => undefined
		};

		it('should throw if no id param', async () => {
			const mockReq = { params: {}, session: {} };
			const mockRes = newMockRes();

			const middleware = buildGetJourneyMiddleware(mockService as any);

			await assert.rejects(() => middleware(mockReq as any, mockRes as any, mockNext), {
				message: 'id param required'
			});
			assert.strictEqual(mockNext.mock.callCount(), 0);
		});

		it('should return 404 (call notFoundHandler) if case not found', async () => {
			const mockReq = { params: { id: 'case-1' }, session: {} };
			const mockRes = newMockRes();

			mockDb.case.findUnique.mock.mockImplementationOnce(() => null as any);
			mockDb.user.findMany.mock.mockImplementationOnce(() => null as any);

			const middleware = buildGetJourneyMiddleware(mockService as any);
			await middleware(mockReq as any, mockRes as any, mockNext);

			assert.strictEqual(mockDb.case.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockNext.mock.callCount(), 0);
		});

		it('should add a back link if on an edit page', async () => {
			const mockReq: any = {
				params: { id: 'case-1', section: 'section' },
				baseUrl: '/case-1',
				originalUrl: '/case-1/edit',
				session: {}
			};
			const mockRes: any = { locals: {} };
			const mockDb = {
				$transaction: mock.fn(async (promises) => Promise.all(promises)),
				case: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						receivedDate: Date.now()
					}))
				},
				user: {
					findMany: mock.fn(() => [])
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				authConfig: {
					groups: []
				},
				getEntraClient: () => ({
					listAllGroupMembers: async () => [
						{
							id: 'user-1',
							displayName: 'Test User'
						}
					]
				}),
				audit: {
					getLastModifiedInfo: mock.fn(() => Promise.resolve({ date: null, by: null }))
				}
			} as any);
			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(mockRes.locals.journey);
			assert.strictEqual(mockRes.locals.backLinkUrl, '/case-1');
		});
	});

	describe('combineSessionAndDbData & mergeArraysById', () => {
		const mockRes: any = { locals: { journeyResponse: { answers: {} } } };

		it('should return DB answers unchanged if no session answers exist', () => {
			const dbData = { name: 'DB Name' };
			const emptyRes: any = { locals: {} };

			const result = combineSessionAndDbData(emptyRes, dbData);
			assert.deepStrictEqual(result, dbData);
		});

		it('should overwrite scalar values (strings/bools) from session', () => {
			const dbData = { name: 'Old Name', isValid: true };
			mockRes.locals.journeyResponse.answers = { name: 'New Name' };

			const result = combineSessionAndDbData(mockRes, dbData);

			assert.strictEqual(result.name, 'New Name');
			assert.strictEqual(result.isValid, true);
		});

		it('should APPEND new items to arrays if IDs do not match (Create Scenario)', () => {
			const dbData = {
				inspectors: [{ id: '1', name: 'Inspector A' }]
			};

			mockRes.locals.journeyResponse.answers = {
				inspectors: [{ id: '2', name: 'Inspector B' }]
			};

			const result = combineSessionAndDbData(mockRes, dbData) as { inspectors: Record<string, unknown>[] };

			assert.strictEqual(result.inspectors.length, 2);
			assert.strictEqual(result.inspectors[0].name, 'Inspector A');
			assert.strictEqual(result.inspectors[1].name, 'Inspector B');
		});

		it('should MERGE existing items in arrays if IDs match (Update Scenario)', () => {
			const dbData = {
				inspectors: [
					{ id: '1', name: 'Inspector A', role: 'Lead' },
					{ id: '2', name: 'Inspector B', role: 'Assistant' }
				]
			};

			mockRes.locals.journeyResponse.answers = {
				inspectors: [{ id: '2', name: 'Inspector B (Updated)' }]
			};

			const result = combineSessionAndDbData(mockRes, dbData) as { inspectors: Record<string, unknown>[] };

			assert.strictEqual(result.inspectors.length, 2, 'Should not increase array length on update');

			const updatedItem = result.inspectors[1];
			assert.strictEqual(updatedItem.id, '2');
			assert.strictEqual(updatedItem.name, 'Inspector B (Updated)');

			assert.strictEqual(updatedItem.role, 'Assistant', 'Should merge objects, not replace entirely');
		});

		it('should handle items without IDs by appending them', () => {
			const dbData = { tags: [{ label: 'Urgent' }] };

			mockRes.locals.journeyResponse.answers = { tags: [{ label: 'Review' }] };

			const result = combineSessionAndDbData(mockRes, dbData) as { tags: Record<string, unknown>[] };

			assert.strictEqual(result.tags.length, 2);
			assert.strictEqual(result.tags[1].label, 'Review');
		});

		it('should REMOVE DB items if their ID is present in the removedIds array (Delete Scenario)', () => {
			const dbData = {
				inspectors: [
					{ id: '1', name: 'Inspector A' },
					{ id: '2', name: 'Inspector B' },
					{ id: '3', name: 'Inspector C' }
				]
			};

			mockRes.locals.journeyResponse.answers = {};
			const removedIds = ['2'];

			const result = combineSessionAndDbData(mockRes, dbData, removedIds) as { inspectors: Record<string, unknown>[] };

			assert.strictEqual(result.inspectors.length, 2, 'Should remove exactly one item');
			assert.strictEqual(result.inspectors[0].id, '1');
			assert.strictEqual(result.inspectors[1].id, '3', 'Inspector B should be sliced out');
		});

		it('should handle complex scenarios: Remove an item, Update an item, and Create an item simultaneously', () => {
			const dbData = {
				inspectors: [
					{ id: '1', name: 'Inspector A', role: 'Lead' },
					{ id: '2', name: 'Inspector B', role: 'Assistant' }
				]
			};

			mockRes.locals.journeyResponse.answers = {
				inspectors: [
					{ id: '1', name: 'Inspector A (Updated)' },
					{ id: '3', name: 'Inspector C (New)' }
				]
			};

			const removedIds = ['2'];

			const result = combineSessionAndDbData(mockRes, dbData, removedIds) as { inspectors: Record<string, unknown>[] };

			assert.strictEqual(result.inspectors.length, 2, 'Should end up with 2 items');

			assert.strictEqual(result.inspectors[0].id, '1');
			assert.strictEqual(result.inspectors[0].name, 'Inspector A (Updated)');
			assert.strictEqual(result.inspectors[0].role, 'Lead');

			const removedItem = result.inspectors.find((i: any) => i.id === '2');
			assert.strictEqual(removedItem, undefined, 'Inspector B should be gone');

			assert.strictEqual(result.inspectors[1].id, '3');
			assert.strictEqual(result.inspectors[1].name, 'Inspector C (New)');
		});

		it('should bring over brand new keys from the session that do not exist in the DB answers', () => {
			const dbData = { existingField: 'DB Value' };

			mockRes.locals.journeyResponse.answers = {
				existingField: 'Session Value',
				brandNewField: 'Brand New Value',
				newArrayField: [{ id: '99', label: 'New Array Item' }]
			};

			const result = combineSessionAndDbData(mockRes, dbData) as {
				newArrayField: Record<string, unknown>[];
				existingField: string;
				brandNewField: string;
			};

			assert.strictEqual(result.existingField, 'Session Value');
			assert.strictEqual(result.brandNewField, 'Brand New Value');
			assert.strictEqual(Array.isArray(result.newArrayField), true);
			assert.strictEqual(result.newArrayField[0].label, 'New Array Item');
		});
	});
});
