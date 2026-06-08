import { UkAddress } from 'cypress/types/standard.ts';
import { generateUkAddress } from './generate.utility.ts';

type AddressFieldKey = 'address-line-1' | 'address-line-2' | 'address-town' | 'address-county' | 'address-postcode';

type AddressErrorType =
	| 'line1TooLong'
	| 'line2TooLong'
	| 'townTooLong'
	| 'countyTooLong'
	| 'postcodeLength'
	| 'invalidPostcodeFormat';

type AddressErrorConfig = {
	message: string;
	inlineId: string;
	inputId: AddressFieldKey;
};

const addressErrorMap: Record<AddressErrorType, AddressErrorConfig> = {
	line1TooLong: {
		message: 'Address line 1 must be 250 characters or less',
		inlineId: 'address-line-1-error',
		inputId: 'address-line-1'
	},
	line2TooLong: {
		message: 'Address line 2 must be 250 characters or less',
		inlineId: 'address-line-2-error',
		inputId: 'address-line-2'
	},
	townTooLong: {
		message: 'Town or city must be 250 characters or less',
		inlineId: 'address-town-error',
		inputId: 'address-town'
	},
	countyTooLong: {
		message: 'County must be 250 characters or less',
		inlineId: 'address-county-error',
		inputId: 'address-county'
	},
	postcodeLength: {
		message: 'Postcode must be between 5 and 8 characters',
		inlineId: 'address-postcode-error',
		inputId: 'address-postcode'
	},
	invalidPostcodeFormat: {
		message: 'Enter a valid postcode',
		inlineId: 'address-postcode-error',
		inputId: 'address-postcode'
	}
};

class AddressUtility {
	/**
	 * Fills address fields using generated defaults merged with optional overrides,
	 * and returns the final address used.
	 */
	enterAddress(overrides?: Partial<UkAddress>, useGeneratedDefaults = true): UkAddress {
		const address: UkAddress = {
			...(useGeneratedDefaults
				? generateUkAddress()
				: {
						line1: '',
						line2: '',
						town: '',
						county: '',
						postcode: ''
					}),
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
	 * Validates address errors using known error types.
	 */
	validateAddressErrors(errorType?: AddressErrorType | AddressErrorType[]): void {
		if (!errorType) {
			cy.get('.govuk-error-summary').should('not.exist');
			return;
		}

		const errorsToCheck = Array.isArray(errorType) ? errorType : [errorType];

		cy.get('.govuk-error-summary')
			.should('exist')
			.and('be.visible')
			.within(() => {
				cy.contains('h2', 'There is a problem').should('be.visible');
				cy.get('.govuk-error-summary__list li').should('have.length', errorsToCheck.length);
			});

		errorsToCheck.forEach((error) => {
			const { message, inlineId, inputId } = addressErrorMap[error];

			cy.get('.govuk-error-summary').within(() => {
				cy.contains('a', message).should('exist').and('be.visible');
			});

			cy.get(`#${inlineId}`)
				.should('be.visible')
				.invoke('text')
				.then((text) => {
					expect(text.replace('Error:', '').trim()).to.eq(message);
				});

			cy.get(`#${inputId}`).should('have.class', 'govuk-input--error').and('have.attr', 'aria-describedby', inlineId);
		});
	}
}

export default new AddressUtility();
