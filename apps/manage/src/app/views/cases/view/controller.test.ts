import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildViewCaseDetails, validateIdFormat, buildGetJourneyMiddleware } from './controller.ts';
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
			const mockReq: any = { params: { id: 'case-1' }, baseUrl: '/case-1', originalUrl: '/case-1/edit' };
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
});
