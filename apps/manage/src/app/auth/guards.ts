import * as authSession from './session.service.ts';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AuthService } from './auth-service.ts';
import type { Logger } from 'pino';

const _403View = 'views/errors/403';

/**
 * Assert the user is authenticated. As the web application depends on external
 * authentication via MSAL, then the presence of an account alone in the session
 * is not sufficient to say the user is still authenticated: The validity of the
 * access token associated with that account must frequently be evaluated
 * against MSAL.
 *
 * As the typical lifetime of an access token is 60 - 75 minutes, it must be
 * refreshed silently to avoid the user having to directly reauthenticate. As a
 * consequence, this guard will silently refresh the authentication result using
 * the refresh token held internally by the @azure/msal-node package. (This
 * refresh token has a longer expiry duration of about one day).
 *
 * The user is ultimately considered authenticated with the application if the
 * existing authentication result could be silently refreshed.
 */
export function buildAssertIsAuthenticated(logger: Logger, authService: AuthService): RequestHandler {
	return async (request, response, next) => {
		const sessionAccount = authSession.getAccount(request.session);

		if (!sessionAccount) {
			return response.redirect(`/auth/signin?redirect_to=${request.originalUrl}`);
		}

		try {
			// Eagerly invoke the `acquireTokenSilent` method: Internally,
			// @azure/msal-node will evaluate if the access token has (or is close to)
			// expired on the existing authentication result, and only then make a
			// network call with the refresh token to acquire a new authentication
			// result.
			const refreshedAuthenticationResult = await authService.acquireTokenSilent(sessionAccount, request.session.id);
			if (refreshedAuthenticationResult) {
				authSession.setAccount(request.session, refreshedAuthenticationResult);
				return next();
			}
			return response.redirect('/auth/signout/');
		} catch (error) {
			logger.info(
				error,
				`Failed to refresh MSAL authentication. User redirected to sign in from '${request.originalUrl}'`
			);
			return response.redirect(`/auth/signin?redirect_to=${request.originalUrl}`);
		}
	};
}

/**
 * Assert the user is unauthenticated.
 */
export function assertIsUnauthenticated({ session }: Request, response: Response, next: NextFunction): void {
	if (!authSession.getAccount(session)) {
		next();
	} else {
		response.redirect(`/`);
	}
}

/**
 * Assert that the user's authenticated account has access to the provided groups.
 */
export function buildAssertGroupAccess(logger: Logger, ...groupIds: string[]): RequestHandler {
	return (req, res, next) => {
		const account = authSession.getAccount(req.session);

		if (Array.isArray(account?.idTokenClaims?.groups)) {
			for (const groupId of groupIds) {
				if (groupId && account.idTokenClaims.groups.includes(groupId)) {
					return next();
				}
			}
			logger.warn(
				{ actual: account.idTokenClaims.groups, expected: groupIds },
				'Authorisation failed. User does not belong to any of the expected groups.'
			);
			return res.status(403).render(_403View);
		}
		if (account?.idTokenClaims?.claimName || account?.idTokenClaims?.claimSources) {
			logger.error('Authorisation error. User has too many groups: groups overage claim occurred.');
		} else {
			logger.warn('Authorisation error. User does not belong to any groups.');
		}
		res.status(403).render(_403View);
	};
}

/**
 * Assert that the user's authenticated account has access to the provided groups.
 */
export function assertUserHasPermission(permission: string): RequestHandler {
	return (req, res, next) => {
		const permissions = req.session.permissions;

		if (permissions && permissions[permission]) {
			return next();
		}

		res.render(_403View);
	};
}
