// @ts-nocheck
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveController } from './save.ts';

describe('buildSaveController', () => {
	describe('end-to-end', () => {
		it('should call db.$transaction and redirect on success', async () => {
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb))
			};
			const mockLogger = { error: mock.fn() };

			const mockReq = { baseUrl: '/test-url' };
			const mockRes = {
				locals: { journeyResponse: { answers: { foo: 'bar' } } },
				redirect: mock.fn()
			};

			const controller = buildSaveController({ db: mockDb, logger: mockLogger });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/test-url');
		});

		it('should throw if res.locals is missing', async () => {
			const controller = buildSaveController({ db: {}, logger: {} });
			await assert.rejects(async () => controller({} as any, {} as any), { message: 'journey response required' });
		});

		it('should throw if res.locals.journeyResponse is missing', async () => {
			const controller = buildSaveController({ db: {}, logger: {} });
			await assert.rejects(async () => controller({} as any, { locals: {} } as any), {
				message: 'journey response required'
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
				message: 'answers should be an object'
			});
		});

		it('should log error and throw if db.$transaction fails', async () => {
			const testError = new Error('transaction failed');
			const mockDb = {
				$transaction: async () => {
					throw testError;
				}
			};
			let loggedError: any = null;
			const mockLogger = {
				error: (arg: any) => {
					loggedError = arg.error;
				}
			};
			const mockReq = { baseUrl: '/test-url' };
			const mockRes = {
				locals: { journeyResponse: { answers: { foo: 'bar' } } },
				redirect: mock.fn()
			};

			const controller = buildSaveController({ db: mockDb, logger: mockLogger });

			await assert.rejects(async () => controller(mockReq as any, mockRes as any), {
				message: 'error saving upload document journey'
			});

			assert.strictEqual(loggedError, testError);
		});
	});
});
