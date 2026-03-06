import { Cookie } from 'playwright-core';

const setCookieToContentWindow = (
	contentWindow: Cypress.AUTWindow,
	name: string,
	value: string,
	{ expireMinutes = 1 } = {}
) => {
	const date = new Date();
	const expireTime = expireMinutes * 60 * 1000;

	date.setTime(date.getTime() + expireTime);

	const assignment = `${name}=${encodeURIComponent(value)}`;
	const expires = `expires=${date.toUTCString()}`;
	const path = 'path=/';

	contentWindow.document.cookie = [assignment, expires, path].join(';');
};

Cypress.Commands.add('authVisit', (endpoint: string) => {
	cy.task<Cookie[]>('authenticate').then((cookies) => {
		cy.visit(endpoint, {
			onBeforeLoad: (contentWindow) => {
				for (const cookie of cookies) {
					setCookieToContentWindow(contentWindow, cookie.name, cookie.value);
				}
			}
		});
	});
});

Cypress.Commands.add('verifyPageLoaded', (pageName) => {
	cy.window({ timeout: 12000 })
		.its('document.readyState')
		.should('eq', 'complete')
		.then((readyState) => {
			if (readyState !== 'complete') {
				throw new Error(`${pageName} - page did not fully load in time - Test Failed`);
			}
		});
});

Cypress.Commands.add('verifyPageURL', (contains: string | string[], options?: { timeout?: number }) => {
	const timeout = options?.timeout ?? 12_000;
	const expectedParts = Array.isArray(contains) ? contains : [contains];

	cy.window({ timeout })
		.its('document.readyState')
		.should('eq', 'complete')
		.then(() => {
			const baseUrl = Cypress.config('baseUrl') as string | undefined;

			cy.url().then((currentUrl) => {
				if (baseUrl) {
					expect(currentUrl, 'URL should start with baseUrl').to.include(baseUrl);
				}

				for (const part of expectedParts) {
					expect(currentUrl, `URL should include "${part}"`).to.include(part);
				}
			});
		});
});

Cypress.Commands.add('verifyPageTitle', (expectedTitle: string, options?: { timeout?: number }) => {
	const timeout = options?.timeout ?? 12_000;

	cy.get('h1', { timeout })
		.should('exist')
		.and('be.visible')
		.invoke('text')
		.then((text) => {
			const actual = text.trim();

			expect(actual, `Expected page title to be "${expectedTitle}" but found "${actual}"`).to.eq(expectedTitle);
		});
});
