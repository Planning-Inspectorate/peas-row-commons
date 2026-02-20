import CommonUtility from 'cypress/pageUtilities/common.utility.ts';

class LoginPage {
	private readonly origin = 'https://login.microsoftonline.com';

	loginToTestEnviroment(): void {
		CommonUtility.clearBrowserState();

		// cy.intercept(
		// 	{
		// 		method: 'GET',
		// 		hostname: 'login.microsoftonline.com',
		// 		pathname: /\/oauth2\/v2\.0\/authorize$/,
		// 		query: { sso_reload: 'true' }
		// 	},
		// 	(req) => {
		// 		req.reply({
		// 			statusCode: 204,
		// 			body: ''
		// 		});
		// 	}
		// );

		// cy.visit('/', { failOnStatusCode: false });

		// cy.location('origin', { timeout: 60000 }).should('include', 'https://login.microsoftonline.com');

		// this.isPageVisible('signIn');
		// this.enterCredential('email');
		// this.clickButton('next');
		// this.isPageVisible('enterPassword');
		// this.enterCredential('password');
		// this.clickButton('signIn');
	}

	isPageVisible(page: 'signIn' | 'enterPassword'): void {
		const expected = {
			signIn: {
				title: 'Sign in',
				buttonValue: 'Next'
			},
			enterPassword: {
				title: 'Enter password',
				buttonValue: 'Sign in'
			}
		} as const;

		cy.location('href', { timeout: 60000 }).should('include', 'login.microsoftonline.com');

		cy.origin(this.origin, { args: { page, expected } }, ({ page, expected }) => {
			cy.contains('[role="heading"][aria-level="1"]', expected[page].title, { timeout: 60000 })
				.should('exist')
				.and('be.visible');

			if (page === 'signIn') {
				cy.get('input[name="loginfmt"][type="email"]', { timeout: 60000 }).should('exist').and('be.visible');
			}

			if (page === 'enterPassword') {
				cy.get('input[name="passwd"][type="password"]', { timeout: 60000 }).should('exist').and('be.visible');
			}

			cy.get('input[type="submit"]', { timeout: 60000 })
				.should('exist')
				.and('be.visible')
				.and('have.value', expected[page].buttonValue);
		});
	}

	enterCredential(step: 'email' | 'password'): void {
		const email = Cypress.env('adminUsername') as string | undefined;
		const password = Cypress.env('adminPassword') as string | undefined;

		if (!email) {
			throw new Error('ADMIN_EMAIL not configured in Cypress.env (adminUsername)');
		}

		if (!password) {
			throw new Error('ADMIN_PASSWORD not configured in Cypress.env (adminPassword)');
		}

		cy.origin(this.origin, { args: { step, email, password } }, ({ step, email, password }) => {
			if (step === 'email') {
				cy.get('input[name="loginfmt"][type="email"]', { timeout: 60000 })
					.should('be.visible')
					.clear()
					.type(email)
					.should('have.value', email);
			}

			if (step === 'password') {
				cy.get('input[name="passwd"][type="password"]', { timeout: 60000 })
					.should('be.visible')
					.clear()
					.type(password, { log: false })
					.should('have.value', password);
			}
		});
	}

	clickButton(button: 'next' | 'signIn'): void {
		const expectedValueMap = {
			next: 'Next',
			signIn: 'Sign in'
		};

		const expectedValue = expectedValueMap[button];

		cy.origin(this.origin, { args: { expectedValue } }, ({ expectedValue }) => {
			cy.get('#idSIButton9').should('be.visible').and('have.value', expectedValue).click();
		});
	}
}

export default new LoginPage();
