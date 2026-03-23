import { chromium, type Browser, type Cookie } from 'playwright-core';
import { config as dotenvConfig } from 'dotenv';
import { LoginMicrosoftPage } from '../page-objects/login-microsoft.page.ts';

dotenvConfig();

/**
 * Custom error used to wrap authentication and config failures
 * with clearer setup-specific messaging.
 */
class AuthError extends Error {
	public cause?: unknown;
	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = 'AuthError';
		this.cause = cause;
	}
}

/**
 * Reads a required Cypress env value and throws a clear error if it is missing or not a string.
 * Throws error if the required env's are missing before tests run.
 */
function requireConfigEnv(config: Cypress.PluginConfigOptions, name: string): string {
	const v = config.env?.[name];
	if (!v || typeof v !== 'string') {
		throw new AuthError(`Missing Cypress env "${name}" (config.env.${name}). Check cypress.config.ts / CI secrets.`);
	}
	return v;
}

/**
 * Registers Cypress node tasks used during test execution.
 * The authenticate task logs in via Playwright and returns session cookies.
 */
export function setupNodeEvents(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
	on('task', {
		async authenticate(): Promise<Cookie[]> {
			let browser: Browser | undefined;

			try {
				const baseUrl = typeof config.baseUrl === 'string' ? config.baseUrl : requireConfigEnv(config, 'baseUrl');

				const email = requireConfigEnv(config, 'adminUsername');
				const password = requireConfigEnv(config, 'adminPassword');

				browser = await chromium.launch({ headless: true });
				const context = await browser.newContext();
				const page = await context.newPage();
				const msLogin = new LoginMicrosoftPage(page);

				await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
				await msLogin.login(email, password);
				await page.locator('[href="/auth/signout"]').waitFor({ state: 'visible', timeout: 30_000 });

				return await context.cookies();
			} catch (err) {
				const details = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
				throw new AuthError(`Microsoft authentication login failed. ${details}`, err);
			} finally {
				await browser?.close();
			}
		}
	});

	return config;
}
