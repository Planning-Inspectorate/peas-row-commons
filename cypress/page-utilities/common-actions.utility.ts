class CommonActionsUtility {
	/**
	 * Clears cookies, local/session storage, and Cypress sessions
	 * to ensure a clean browser state between tests.
	 */
	clearBrowserState(): void {
		cy.clearCookies();
		cy.clearLocalStorage();
		cy.window().then((win) => {
			win.sessionStorage.clear();
		});
		Cypress.session.clearAllSavedSessions();
	}

	/**
	 * Accepts the cookie banner if present and visible,
	 * then hides it to prevent UI interference in tests.
	 */
	acceptCookiesIfVisible(): void {
		const bannerSel = '#global-cookie-message';

		cy.get('body').then(($body) => {
			const hasBanner = $body.find(bannerSel).length > 0;

			if (!hasBanner) return;

			cy.get(bannerSel, { timeout: 2000 }).then(($banner) => {
				const isVisible = $banner.is(':visible');
				if (!isVisible) return;

				const acceptBtn = $banner
					.find('button')
					.filter((_, el) => (el.textContent || '').trim() === 'Accept additional cookies');

				const hideBtn = $banner
					.find('button')
					.filter((_, el) => /hide cookie message/i.test((el.textContent || '').trim()));

				if (acceptBtn.length) {
					cy.wrap(acceptBtn.first()).click({ timeout: 3000 });
				}
				if (hideBtn.length) {
					cy.wrap(hideBtn.first()).click({ timeout: 3000 });
				}

				cy.get(bannerSel, { timeout: 5000 }).should('not.be.visible');
			});
		});
	}

	/**
	 * Clicks a common page action button based on a predefined option,
	 * and fails if the expected button is not present.
	 */
	clickActionButton(
		option: 'back' | 'addDetails' | 'saveAndContinue' | 'continue' | 'cancel' | 'save' | 'removeAndSave'
	): void {
		const selectorMap: Record<typeof option, string[]> = {
			back: ['a.govuk-back-link'],
			addDetails: ['a.govuk-button:contains("Add details")'],
			saveAndContinue: ['[data-cy="button-save-and-continue"]', 'button.govuk-button:contains("Save and continue")'],
			continue: ['[data-cy="button-save-and-continue"]', 'button.govuk-button:contains("Continue")'],
			cancel: ['a.govuk-button:contains("Cancel")'],
			save: ['button.govuk-button:contains("Save")'],
			removeAndSave: ['[data-cy="button-remove-and-save"]']
		};

		const selectors = selectorMap[option];

		cy.get('body').then(($body) => {
			const foundSelector = selectors.find((sel) => $body.find(sel).length > 0);

			if (!foundSelector) {
				throw new Error(`Test Failed: Action button "${option}" was not found`);
			}

			cy.get(foundSelector).should('be.visible').click();
		});
	}
}

export default new CommonActionsUtility();
