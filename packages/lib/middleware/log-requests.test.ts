import { strict as assert } from 'node:assert';
import { describe, mock, test } from 'node:test';
import { buildLogRequestsMiddleware } from './log-requests.ts';

describe('log-requests', () => {
	describe('buildLogRequestsMiddleware', () => {
		test('logs basic request information', (t) => {
			const logger = {
				debug: mock.fn()
			};
			const handler = buildLogRequestsMiddleware(logger);
			const res = {
				statusCode: 200,
				req: { method: 'GET', originalUrl: 'example.app' }
			};

			const next = mock.fn(() => {});

			handler({}, res, next);

			assert.strictEqual(logger.debug.mock.callCount(), 1);
			assert.strictEqual(next.mock.callCount(), 1);

			const arg = logger.debug.mock.calls[0].arguments[0];
			assert.match(arg, /200/);
			assert.match(arg, /GET/);
			assert.match(arg, /example.app/);
			assert.strictEqual(logger.debug.mock.callCount(), 1);
		});
	});
});
