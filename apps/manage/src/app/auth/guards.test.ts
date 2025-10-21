// @ts-nocheck
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';
import { buildAssertGroupAccess, buildAssertIsAuthenticated } from './guards.ts';

const mockRes = () => {
	const res = {
		redirect: mock.fn(),
		status: mock.fn(),
		render: mock.fn()
	};
	res.status.mock.mockImplementation(() => res);
	res.render.mock.mockImplementation(() => res);
	return res;
};

describe('auth guard', () => {
	describe('buildAssertGroupAccess', () => {
		it('should return 403 if no account', () => {
			const logger = mockLogger();
			const handler = buildAssertGroupAccess(logger);

			const req = {
				session: {}
			};
			const res = mockRes();
			handler(req, res, () => {});

			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.deepStrictEqual(res.status.mock.calls[0].arguments, [403]);

			assert.strictEqual(res.render.mock.callCount(), 1);
			assert.match(res.render.mock.calls[0].arguments[0], /403/);
		});

		it(`should return 403 if no groups don't match`, () => {
			const logger = mockLogger();
			const handler = buildAssertGroupAccess(logger, 'group-a');

			const req = {
				session: {
					account: {
						idTokenClaims: {
							groups: ['group-1', 'group-2']
						}
					}
				}
			};
			const res = mockRes();
			handler(req, res, () => {});

			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.deepStrictEqual(res.status.mock.calls[0].arguments, [403]);

			assert.strictEqual(res.render.mock.callCount(), 1);
			assert.match(res.render.mock.calls[0].arguments[0], /403/);
		});
		it(`should call next if groups match`, () => {
			const logger = mockLogger();
			const handler = buildAssertGroupAccess(logger, 'group-a');

			const req = {
				session: {
					account: {
						idTokenClaims: {
							groups: ['group-1', 'group-2', 'group-a']
						}
					}
				}
			};
			const res = mockRes();
			const next = mock.fn();
			handler(req, res, next);

			assert.strictEqual(res.status.mock.callCount(), 0);
			assert.strictEqual(res.render.mock.callCount(), 0);
			assert.strictEqual(next.mock.callCount(), 1);
		});
	});

	describe('buildAssertIsAuthenticated', () => {
		it('should redirect if no account', async () => {
			const logger = mockLogger();
			const authService = mock.fn();
			const handler = buildAssertIsAuthenticated(logger, authService);

			const req = {
				session: {}
			};
			const res = mockRes();
			await handler(req, res, () => {});

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.match(res.redirect.mock.calls[0].arguments[0], /\/auth\/signin/);
		});

		it(`should redirect if token refresh error`, async () => {
			const logger = mockLogger();
			const authService = {
				acquireTokenSilent() {
					throw new Error('token error');
				}
			};
			const handler = buildAssertIsAuthenticated(logger, authService);

			const req = {
				session: {
					account: {}
				}
			};
			const res = mockRes();
			await handler(req, res, () => {});

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.match(res.redirect.mock.calls[0].arguments[0], /\/auth\/signin/);
		});

		it(`should signout if no token refresh`, async () => {
			const logger = mockLogger();
			const authService = {
				async acquireTokenSilent() {
					return null;
				}
			};
			const handler = buildAssertIsAuthenticated(logger, authService);

			const req = {
				session: {
					account: {}
				}
			};
			const res = mockRes();
			await handler(req, res, () => {});

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.match(res.redirect.mock.calls[0].arguments[0], /\/auth\/signout/);
		});

		it(`should call next if authenticated`, async () => {
			const logger = mockLogger();
			const authService = {
				async acquireTokenSilent() {
					return 'token';
				}
			};
			const handler = buildAssertIsAuthenticated(logger, authService);

			const req = {
				session: {
					account: {}
				}
			};
			const res = mockRes();
			const next = mock.fn();
			await handler(req, res, next);

			assert.strictEqual(res.redirect.mock.callCount(), 0);
			assert.strictEqual(next.mock.callCount(), 1);
		});
	});
});
