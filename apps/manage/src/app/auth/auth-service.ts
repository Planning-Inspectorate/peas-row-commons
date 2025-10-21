import * as authSession from './session.service.ts';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { buildMsalConfig } from '#util/auth.ts';
import type { Config } from '../config.ts';
import type { AccountInfo, AuthenticationResult, Configuration } from '@azure/msal-node';
import type { Logger } from 'pino';
import type { RedisClient } from '@pins/peas-row-commons-lib/redis/redis-client.ts';
import type { RequestHandler } from 'express';

type AuthenticationResultWithNonce = AuthenticationResult & {
	idTokenClaims: {
		nonce?: string;
	};
};

const scopes = ['User.Read'];

export interface AuthServiceOptions {
	config: Config['auth'];
	logger: Logger;
	redisClient: RedisClient | null;
}

export class AuthService {
	readonly #config: Config['auth'];
	readonly #logger: Logger;
	readonly #redisClient: RedisClient | null;
	#msalClient: ConfidentialClientApplication | null;

	constructor({ config, logger, redisClient }: AuthServiceOptions) {
		this.#config = config;
		this.#logger = logger;
		this.#redisClient = redisClient;

		this.#msalClient = null;
	}

	/**
	 * Acquire a {@link AuthenticationResultWithNonce} using a code sourced from the user
	 * having signed in manually at a MSAL authentication url.
	 */
	async acquireTokenByCode({
		code,
		sessionId
	}: {
		code: string;
		sessionId: string;
	}): Promise<AuthenticationResultWithNonce | null> {
		const msalClient = this.#getMsalClient(sessionId);
		await msalClient.getTokenCache().getAllAccounts(); // required to trigger beforeCacheAccess

		return await msalClient.acquireTokenByCode({
			authority: this.#config.authority,
			code,
			redirectUri: this.#config.redirectUri,
			scopes
		});
	}

	/**
	 * Acquire a new {@link AuthenticationResultWithNonce} using an account. Note that
	 * `acquireTokenSilent` will use a cached access token where possible, and only
	 * use a network request as a last resort.
	 */
	async acquireTokenSilent(
		account: AccountInfo,
		sessionId: string,
		customScopes: string[] = scopes
	): Promise<AuthenticationResultWithNonce | null> {
		const msalClient = this.#getMsalClient(sessionId);
		await msalClient.getTokenCache().getAllAccounts(); // required to trigger beforeCacheAccess

		return await msalClient.acquireTokenSilent({
			account,
			scopes: customScopes
		});
	}

	/**
	 * Clear the token cache of all accounts/access tokens. This will force the
	 * msalClient to renegotiate authentication via a network request. To be used
	 * when signing a user out.
	 */
	async clearCacheForAccount(account: AccountInfo, sessionId: string): Promise<void> {
		const msalClient = this.#getMsalClient(sessionId);
		await msalClient.getTokenCache().removeAccount(account);
	}

	/**
	 * Obtain a url for the user to sign in using MSAL authentication. This url is
	 * scoped to the application via the `nonce` property.
	 */
	async getAuthCodeUrl(options: { nonce: string }, sessionId: string): Promise<string> {
		const msalClient = this.#getMsalClient(sessionId);
		return msalClient.getAuthCodeUrl({
			...options,
			authority: this.#config.authority,
			redirectUri: this.#config.redirectUri,
			scopes
		});
	}

	/**
	 * If not using Redis, behave as a singleton and return the one global MSAL client.
	 * If using Redis, generate an MSAL client specific to the user's session ID.
	 */
	#getMsalClient(sessionId: string): ConfidentialClientApplication {
		const msalConfig = this.#buildMsalConfig();
		if (this.#redisClient) {
			return new ConfidentialClientApplication({
				...msalConfig,
				cache: { cachePlugin: this.#redisClient.makeCachePlugin(sessionId) }
			});
		}

		if (!this.#msalClient) {
			this.#msalClient = new ConfidentialClientApplication(msalConfig);
		}

		return this.#msalClient;
	}

	/**
	 */
	#buildMsalConfig(): Configuration {
		const config = this.#config;
		const logger = this.#logger;
		return buildMsalConfig({ config, logger });
	}
}

export const registerAuthLocals: RequestHandler = (req, res, next) => {
	const account = authSession.getAccount(req.session);
	res.locals.isAuthenticated = Boolean(account);
	next();
};

export const clearAuthenticationData: RequestHandler = ({ session }, _, next) => {
	authSession.destroyAuthenticationData(session);
	next();
};
