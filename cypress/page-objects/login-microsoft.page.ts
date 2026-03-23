import type { Page } from 'playwright-core';

export class LoginMicrosoftPage {
	private readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async clickSubmitButton(): Promise<void> {
		const button = this.page.locator('#idSIButton9');
		await button.waitFor({ state: 'visible', timeout: 60_000 });
		await button.click();
	}

	async enterEmail(email: string): Promise<void> {
		const emailField = this.page.locator('input[name="loginfmt"]');
		await emailField.waitFor({ state: 'visible', timeout: 60_000 });
		await emailField.fill(email);
	}

	async enterPassword(password: string): Promise<void> {
		const passwordField = this.page.locator('input[name="passwd"]');
		await passwordField.waitFor({ state: 'visible', timeout: 60_000 });
		await passwordField.fill(password);
	}

	async login(email: string, password: string): Promise<void> {
		await this.enterEmail(email);
		await this.clickSubmitButton();

		await this.enterPassword(password);
		await this.clickSubmitButton();
	}
}
