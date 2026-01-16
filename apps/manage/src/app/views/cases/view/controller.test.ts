import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildViewCaseDetails,
	validateIdFormat,
	buildGetJourneyMiddleware,
	combineSessionAndDbData
} from './controller.ts';
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
			const mockReq = { params: {} };
			const mockRes = newMockRes();

			assert.throws(() => validateIdFormat(mockReq as any, mockRes as any, mockNext), {
				message: 'id param required'
			});
		});

		it('should call next() if id is a valid UUID', () => {
			const mockReq = { params: { id: '00000000-0000-0000-0000-000000000001' } };
			const mockRes = newMockRes();
			const next = mock.fn();

			validateIdFormat(mockReq as any, mockRes as any, next);

			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('should not call next() if id is invalid', () => {
			const mockReq = { params: { id: 'invalid-id-string' } };
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
			const mockReq = { params: {} };
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
			}
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
			const mockReq = { params: {} };
			const mockRes = newMockRes();

			const middleware = buildGetJourneyMiddleware(mockService as any);

			await assert.rejects(() => middleware(mockReq as any, mockRes as any, mockNext), {
				message: 'id param required'
			});
			assert.strictEqual(mockNext.mock.callCount(), 0);
		});

		it('should return 404 (call notFoundHandler) if case not found', async () => {
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = newMockRes();

			mockDb.case.findUnique.mock.mockImplementationOnce(() => null as any);

			const middleware = buildGetJourneyMiddleware(mockService as any);
			await middleware(mockReq as any, mockRes as any, mockNext);

			assert.strictEqual(mockDb.case.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockNext.mock.callCount(), 0);
		});

		it('should add a back link if on an edit page', async () => {
			const mockReq: any = {
				params: { id: 'case-1', section: 'section' },
				baseUrl: '/case-1',
				originalUrl: '/case-1/edit'
			};
			const mockRes: any = { locals: {} };
			const mockDb = {
				case: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						receivedDate: Date.now()
					}))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger(),
				authConfig: {
					groups: []
				},
				getEntraClient: () => undefined
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

			const result = combineSessionAndDbData(mockRes, dbData);

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

			const result = combineSessionAndDbData(mockRes, dbData);

			assert.strictEqual(result.inspectors.length, 2, 'Should not increase array length on update');

			const updatedItem = result.inspectors[1];
			assert.strictEqual(updatedItem.id, '2');
			assert.strictEqual(updatedItem.name, 'Inspector B (Updated)');

			assert.strictEqual(updatedItem.role, 'Assistant', 'Should merge objects, not replace entirely');
		});

		it('should handle items without IDs by appending them', () => {
			const dbData = { tags: [{ label: 'Urgent' }] };

			mockRes.locals.journeyResponse.answers = { tags: [{ label: 'Review' }] };

			const result = combineSessionAndDbData(mockRes, dbData);

			assert.strictEqual(result.tags.length, 2);
			assert.strictEqual(result.tags[1].label, 'Review');
		});
	});
});
