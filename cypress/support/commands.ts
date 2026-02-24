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
