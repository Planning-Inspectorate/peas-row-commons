import { UkAddress } from 'cypress/types/standard.ts';
import { generateUkAddress } from './generate.utility.ts';

type AddressFieldKey = 'address-line-1' | 'address-line-2' | 'address-town' | 'address-county' | 'address-postcode';

type AddressFieldConfig = {
	inputId: AddressFieldKey;
	errorId: string;
};

class AddressUtility {
	private readonly addressFieldMap: AddressFieldConfig[] = [
		{
			inputId: 'address-line-1',
			errorId: 'address-line-1-error'
		},
		{
			inputId: 'address-line-2',
			errorId: 'address-line-2-error'
		},
		{
			inputId: 'address-town',
			errorId: 'address-town-error'
		},
		{
			inputId: 'address-county',
			errorId: 'address-county-error'
		},
		{
			inputId: 'address-postcode',
			errorId: 'address-postcode-error'
		}
	];

	/**
	 * Fills address fields using generated defaults merged with optional overrides,
	 * and returns the final address used.
	 */
	enterAddress(overrides?: Partial<UkAddress>): UkAddress {
		const address: UkAddress = {
			...generateUkAddress(),
			...overrides
		};

		const fillField = (selector: string, value: string): void => {
			cy.get(selector)
				.should('exist')
				.and('be.visible')
				.clear()
				.then(($input) => {
					if (value !== '') {
						cy.wrap($input).type(value).should('have.value', value);
					} else {
						cy.wrap($input).should('have.value', '');
					}
				});
		};

		fillField('#address-line-1', address.line1);
		fillField('#address-line-2', address.line2);
		fillField('#address-town', address.town);
		fillField('#address-county', address.county);
		fillField('#address-postcode', address.postcode);

		return address;
	}

	/**
	 * Validates address errors using explicit expected messages per field
	 */
	validateAddressErrors(expectedErrors: Partial<Record<AddressFieldKey, string>> = {}): void {
		const fieldKeys = Object.keys(expectedErrors) as AddressFieldKey[];

		if (fieldKeys.length === 0) {
			cy.get('.govuk-error-summary').should('not.exist');
			return;
		}

		cy.get('.govuk-error-summary')
			.should('be.visible')
			.within(() => {
				cy.contains('h2', 'There is a problem').should('be.visible');
				cy.get('.govuk-error-summary__list li').should('have.length', fieldKeys.length);
			});

		fieldKeys.forEach((fieldKey) => {
			const field = this.addressFieldMap.find((f) => f.inputId === fieldKey);

			expect(field, `No field config found for ${fieldKey}`).to.not.equal(undefined);
			if (!field) return;

			const expectedMessage = expectedErrors[fieldKey];
			expect(expectedMessage, `No expected error message provided for ${fieldKey}`).to.not.equal(undefined);
			if (!expectedMessage) return;

			cy.get(`#${field.errorId}`)
				.should('be.visible')
				.invoke('text')
				.then((text) => {
					const actual = text.replace('Error:', '').trim();
					expect(actual).to.eq(expectedMessage);
				});

			cy.get(`#${field.inputId}`)
				.should('have.class', 'govuk-input--error')
				.and('have.attr', 'aria-describedby', field.errorId);

			cy.get('.govuk-error-summary').within(() => {
				cy.contains('a', expectedMessage).should('be.visible');
			});
		});
	}
}

export default new AddressUtility();
