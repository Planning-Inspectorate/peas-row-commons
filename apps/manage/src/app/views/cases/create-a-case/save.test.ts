// @ts-nocheck
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveController } from './save.ts';

describe('buildSaveController', () => {
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
				message: 'error saving case journey'
			});

			assert.strictEqual(loggedError, testError);
		});
	});
});
