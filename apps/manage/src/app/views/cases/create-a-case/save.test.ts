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
	});
});
