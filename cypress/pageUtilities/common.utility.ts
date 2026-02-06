class CommonUtility {
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

	clickActionButton(option: 'back' | 'addDetails' | 'saveAndContinue' | 'cancel' | 'save' | 'removeAndSave'): void {
		const selectorMap: Record<typeof option, string> = {
			back: 'a.govuk-back-link',
			addDetails: 'a.govuk-button:contains("Add details")',
			saveAndContinue: '[data-cy="button-save-and-continue"]',
			cancel: 'a.govuk-button:contains("Cancel")',
			save: 'button.govuk-button:contains("Save")',
			removeAndSave: '[data-cy="button-remove-and-save"]'
		};

		const selector = selectorMap[option];

		cy.get('body').then(($body) => {
			if ($body.find(selector).length === 0) {
				throw new Error("Test Failed: Action button specified isn't displayed");
			}

			cy.get(selector).should('be.visible').click();
		});
	}
}

export default CommonUtility;
