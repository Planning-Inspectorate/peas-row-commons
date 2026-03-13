import { chromium, type Browser, type Cookie } from 'playwright-core';
import { config as dotenvConfig } from 'dotenv';
import { LoginMicrosoftPage } from '../pageObjects/loginMicrosoft.page.ts';

dotenvConfig();

class AuthError extends Error {
	public cause?: unknown;
	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = 'AuthError';
		this.cause = cause;
	}
}

function requireConfigEnv(config: Cypress.PluginConfigOptions, name: string): string {
	const v = config.env?.[name];
	if (!v || typeof v !== 'string') {
		throw new AuthError(`Missing Cypress env "${name}" (config.env.${name}). Check cypress.config.ts / CI secrets.`);
	}
	return v;
}

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
				msLogin.login(email, password);
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
