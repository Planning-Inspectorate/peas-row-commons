// @ts-nocheck
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { createRoutesAndGuards } from './router.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';
import { TestServer } from '@pins/peas-row-commons-lib/testing/test-server.ts';

describe('auth', () => {
	describe('authentication', () => {
		const mockAuthService = () => {
			return {
				acquireTokenByCode: mock.fn(),
				acquireTokenSilent: mock.fn(),
				clearCacheForAccount: mock.fn(),
				getAuthCodeUrl: mock.fn()
			};
		};

		const mockSession = (data) => {
			const session = { ...data };
			session.regenerate = (cb) => cb();
			session.save = (cb) => cb();
			session.destroy = mock.fn((cb) => {
				for (const k of Object.keys(session)) {
					if (['regenerate', 'save', 'destroy'].includes(k)) {
						continue;
					}
					delete session[k];
				}
				cb();
			});
			return session;
		};

		/**
		 * @param {import('node:test').TestContext} ctx
		 * @param {any} sessionData
		 * @returns {Promise<{server: TestServer, authService: import('./auth-service.js').AuthService, session: import('express-session')}>}
		 */
		async function setupApp(ctx, sessionData = {}) {
			const app = express();
			const authService = mockAuthService();
			const session = mockSession(sessionData);
			const { router: authRoutes, guards: authGuards } = createRoutesAndGuards(
				{
					authConfig: {
						authority: 'https://example.com/authority',
						clientId: 'client-id',
						clientSecret: 'client-secret',
						disabled: false,
						groups: { applicationAccess: 'group-1' },
						redirectUri: '/redirect',
						signoutUrl: '/signout'
					},
					logger: mockLogger(),
					redisClient: null
				},
				authService
			);
			app.use((req, res, next) => {
				req.session = session;
				next();
			});
			app.use('/unauthenticated', (req, res) => res.send('Unauthenticated'));
			app.use('/auth', authRoutes);

			// check logged in
			app.use(authGuards.assertIsAuthenticated);
			// check group membership
			app.use(authGuards.assertGroupAccess);
			app.get('/home', (req, res) => {
				res.status(200);
			});
			const server = new TestServer(app, { rememberCookies: true });
			await server.start();
			ctx.after(async () => await server.stop());
			return { server, authService, session };
		}

		it('should redirect users to sign-in page', async (ctx) => {
			// this test requires session data to persist between the two calls
			const { server, authService } = await setupApp(ctx);
			const signInUrl = 'example.com/single-sign-on';
			let nonce; // save the nonce to return later
			authService.getAuthCodeUrl.mock.mockImplementation((opts) => {
				nonce = opts.nonce;
				return signInUrl;
			});

			const res = await server.getWithRedirects('/home', 1);
			assert.equal(authService.getAuthCodeUrl.mock.callCount(), 1);
			assert.equal(res.status, 302);
			assert.equal(res.headers.get('location'), signInUrl);

			const code = 'msal_code';
			authService.acquireTokenByCode.mock.mockImplementationOnce(() => ({ idTokenClaims: { nonce } }));
			// access redirect page once auth'd
			const redirectRes = await server.get(`/auth/redirect?code=${code}`, { redirect: 'manual' });
			assert.equal(redirectRes.status, 302);
			assert.equal(redirectRes.headers.get('location'), '/home');
		});

		it('should redirect to an error page when the redirect from MSAL is incomplete', async (ctx) => {
			const { server } = await setupApp(ctx);
			const res = await server.get('/auth/redirect', { redirect: 'manual' });
			assert.equal(res.status, 302);
			assert.match(res.headers.get('location'), /\/unauthenticated/);
		});

		it('should redirect to an error page when the nonce is absent from the acquired token', async (ctx) => {
			const { server, authService } = await setupApp(ctx);
			await server.getWithRedirects('/', 1);

			authService.acquireTokenByCode.mock.mockImplementationOnce(() => ({ idTokenClaims: {} }));

			const res = await server.get('/auth/redirect?code=msal_code', { redirect: 'manual' });
			assert.equal(authService.acquireTokenByCode.mock.callCount(), 1);
			assert.equal(res.status, 302);
			assert.match(res.headers.get('location'), /\/unauthenticated/);
		});

		it('should redirect to an error page when the nonce in the acquired token does not match', async (ctx) => {
			const { server, authService } = await setupApp(ctx);

			await server.getWithRedirects('/', 1);

			authService.acquireTokenByCode.mock.mockImplementationOnce(() => ({ idTokenClaims: { nonce: 'wrong' } }));

			const res = await server.getWithRedirects('/auth/redirect?code=msal_code', 1);
			assert.match(res.url, /\/unauthenticated/);
		});

		it('should redirect to an error page when fetching the auth url fails', async (ctx) => {
			const { server, authService } = await setupApp(ctx);
			authService.getAuthCodeUrl.mock.mockImplementationOnce(() => Promise.reject(new Error('uh oh')));

			const res = await server.get('/', { redirect: 'follow' });
			const text = await res.text();
			assert.match(text, /Error: uh oh/);
		});

		it('should redirect to an error page when acquiring the access token fails', async (ctx) => {
			const { server, authService } = await setupApp(ctx);
			await server.get('/auth/signin', { redirect: 'manual' });

			authService.acquireTokenByCode.mock.mockImplementationOnce(() => Promise.reject(new Error('uh oh')));

			const res = await server.get('/auth/redirect?code=msal_code', { redirect: 'manual' });
			const text = await res.text();
			assert.match(text, /Error: uh oh/);
		});

		it('should silently reacquire a token on each route navigation', async (ctx) => {
			const { server, authService } = await setupApp(ctx, { account: {} });
			await server.get('/', { redirect: 'manual' });
			assert.strictEqual(authService.acquireTokenSilent.mock.callCount(), 1);
		});

		it('should clear any pending authentication data if the MSAL redirect is not subsequently invoked', async (ctx) => {
			const { server } = await setupApp(ctx);
			await server.get('/auth/signin', { redirect: 'manual' });
			await server.get('/', { redirect: 'manual' });
			const res = await server.get('/auth/redirect?code=msal_code', { redirect: 'manual' });
			assert.equal(res.status, 302);
			assert.match(res.headers.get('location'), /\/unauthenticated/);
		});

		it('should destroy the msal token cache and session upon logging out', async (ctx) => {
			const { server, session } = await setupApp(ctx, { account: {} });
			await server.get('/auth/signout', { redirect: 'manual' });
			assert.strictEqual(session.destroy.mock.callCount(), 1);
			const res = await server.get('/home', { redirect: 'manual' });
			assert.equal(res.status, 302);
			assert.match(res.headers.get('location'), /\/auth\/signin/);
		});
	});
});
