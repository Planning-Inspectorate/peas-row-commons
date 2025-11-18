import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildCompleteMsalAuthentication, buildHandleSignout, buildStartMsalAuthentication } from './controller.ts';
import { assertIsUnauthenticated, buildAssertGroupAccess, buildAssertIsAuthenticated } from './guards.ts';
import { AuthService, clearAuthenticationData, registerAuthLocals } from './auth-service.ts';
import type { ManageService } from '#service';
import type { IRouter, Handler } from 'express';

export interface AuthRoutesAndGuards {
	router: IRouter;
	guards: {
		assertIsAuthenticated: Handler;
		assertGroupAccess: Handler;
	};
}

/**
 * @param service
 * @param authService - for testing
 */
export function createRoutesAndGuards(service: ManageService, authService?: AuthService): AuthRoutesAndGuards {
	const router = createRouter();
	if (!authService) {
		authService = new AuthService({
			config: service.authConfig,
			logger: service.logger,
			redisClient: service.redisClient
		});
	}

	// setup controllers with auth service instance
	const completeMsalAuthentication = buildCompleteMsalAuthentication(service.logger, authService);
	const handleSignout = buildHandleSignout(service.logger, service.authConfig.signoutUrl, authService);
	const startMsalAuthentication = buildStartMsalAuthentication(authService);

	router.get('/redirect', assertIsUnauthenticated, asyncHandler(completeMsalAuthentication));

	// If the request continues beyond the MSAL redirectUri, then set the locals
	// derived from the auth session and clear any pending auth data. The latter
	// prevents attackers from hitting /auth/redirect in any meaningful way.
	router.use(registerAuthLocals, clearAuthenticationData);

	router.get('/signin', assertIsUnauthenticated, asyncHandler(startMsalAuthentication));
	router.get('/signout', asyncHandler(handleSignout));

	// create auth guards - to register after the auth routes with the parent router
	// check logged in
	const assertIsAuthenticated = buildAssertIsAuthenticated(service.logger, authService);
	// check group membership
	const assertGroupAccess = buildAssertGroupAccess(service.logger, service.authConfig.groups.applicationAccess);

	return {
		router,
		guards: {
			assertIsAuthenticated,
			assertGroupAccess
		}
	};
}
