import type { DateField, UkAddress } from '../types/standard.ts';
import { faker } from '@faker-js/faker';

/**
 * Builds a case name from the last segment of a journey name, then appends the current date and time for uniqueness.
 */
export function buildCaseName(journeyName: string): string {
	const lastSegment = journeyName
		.split('>')
		.map((part) => part.trim())
		.pop();

	if (!lastSegment) {
		throw new Error(`Unable to generate case name from "${journeyName}"`);
	}

	const now = new Date();

	const date = now.toLocaleDateString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: '2-digit'
	});

	const time = now.toLocaleTimeString('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	return `Auto-${lastSegment}-${date}-${time}`;
}

/**
 * Generates a random string of a given length using:
 * - letters (a-z, A-Z)
 * - numbers (0-9)
 * - special characters
 * - spaces (only within the body, never at start/end)
 */
export function generateRandomString(length: number): string {
	if (length <= 0) return '';

	const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const numbers = '0123456789';
	const specials = '!@£$%^&*()-_=+[]{};:\'",.<>?/\\|';
	const space = ' ';

	const allChars = letters + numbers + specials;

	// Ensure first & last chars are NOT spaces
	const getRandomChar = (chars: string) => chars.charAt(Math.floor(Math.random() * chars.length));

	let result = '';

	for (let i = 0; i < length; i++) {
		if (i === 0 || i === length - 1) {
			result += getRandomChar(allChars);
		} else {
			// Middle can include spaces
			const includeSpace = Math.random() < 0.15;
			result += includeSpace ? space : getRandomChar(allChars);
		}
	}

	return result;
}

/**
 * Builds a name from the last segment of a journey name and adds a Cypress-generated unique suffix.
 */
export function buildNameWithRandomSuffix(journeyName: string): string {
	const lastSegment = journeyName
		.split('>')
		.map((part) => part.trim())
		.pop();

	if (!lastSegment) {
		throw new Error(`Unable to generate name from "${journeyName}"`);
	}

	return `${lastSegment} - ${Cypress._.uniqueId()}`;
}

/**
 * Generates a random date within a wide range around the current year and returns it in day/month/year string format.
 */
export function generateRandomDate(): DateField {
	const today = new Date();

	const startYear = today.getFullYear() - 60;
	const endYear = today.getFullYear() + 60;

	const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;

	const month = Math.floor(Math.random() * 12) + 1;
	const daysInMonth = new Date(year, month, 0).getDate();
	const day = Math.floor(Math.random() * daysInMonth) + 1;

	return {
		day: String(day).padStart(2, '0'),
		month: String(month).padStart(2, '0'),
		year: String(year)
	};
}

/**
 * Generates a realistic UK-style address with optional fields using faker data and weighted probabilities.
 */
export function generateUkAddress(): UkAddress {
	return {
		line1: faker.helpers.maybe(() => faker.location.streetAddress(), { probability: 0.7 }) ?? '',
		line2: faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.4 }) ?? '',
		town: faker.helpers.maybe(() => faker.location.city(), { probability: 0.7 }) ?? '',
		county: faker.helpers.maybe(() => faker.location.county(), { probability: 0.6 }) ?? '',
		postcode: faker.helpers.maybe(() => faker.location.zipCode('??# #??').toUpperCase(), { probability: 0.7 }) ?? ''
	};
}

/**
 * Generates a random phone number (max 15 chars total):
 * - Optional '+' prefix
 * - Optional '(XX)' area code if digits >= 8
 * - Optional spaces
 * - Ensures total length never exceeds 15 characters
 */
export function generatePhoneNumber(): string {
	const MAX_LENGTH = 15;

	const digitsLength = Cypress._.random(0, 15);

	let digits = '';
	for (let i = 0; i < digitsLength; i++) {
		digits += Cypress._.random(0, 9);
	}

	const addPlus = Cypress._.random(0, 1) === 1;
	const canHaveAreaCode = digits.length >= 8;
	const addAreaCode = canHaveAreaCode && Cypress._.random(0, 1) === 1;

	let result = digits;

	if (addAreaCode) {
		const countryCode = Cypress._.random(1, 999).toString();
		result = `(${countryCode}) ${digits}`;
	}

	if (addPlus) {
		result = `+${result}`;
	}

	if (result.length > MAX_LENGTH) {
		const overflow = result.length - MAX_LENGTH;
		const trimmedDigits = digits.slice(0, digits.length - overflow);

		if (addAreaCode) {
			const countryCode = result.match(/\((\d+)\)/)?.[1] ?? '';
			result = `(${countryCode}) ${trimmedDigits}`;
		} else {
			result = trimmedDigits;
		}

		if (addPlus) {
			result = `+${result}`;
		}
	}

	if (result.length < MAX_LENGTH - 1 && Cypress._.random(0, 1) === 1) {
		const insertAt = Cypress._.random(1, result.length - 1);
		const withSpace = result.slice(0, insertAt) + ' ' + result.slice(insertAt);

		if (withSpace.length <= MAX_LENGTH) {
			result = withSpace;
		}
	}

	return result;
}

/**
 * Generates a realistic email address with high variation:
 * - Sometimes empty (~15%)
 * - Multiple local-part patterns
 * - Multiple domain types (personal, gov, org, company)
 * - Optional separators and numbers
 */
export function generateEmail(): string {
	const allowEmpty = Cypress._.random(0, 6) === 0;
	if (allowEmpty) return '';

	const firstNames = ['john', 'sarah', 'alex', 'emma', 'chris', 'olivia', 'daniel', 'michael', 'laura'];
	const lastNames = ['smith', 'connor', 'brown', 'taylor', 'wilson', 'clarke', 'evans', 'walker'];
	const prefixes = ['test', 'info', 'contact', 'admin', 'hello', 'support', 'enquiries'];
	const companies = ['solirius', 'test-company', 'planning-inspectorate', 'local-authority'];
	const tlds = ['.com', '.co.uk', '.org', '.net', '.gov.uk'];

	const separators = ['.', '_', '-', ''];

	const first = Cypress._.sample(firstNames)!;
	const last = Cypress._.sample(lastNames)!;
	const separator = Cypress._.sample(separators)!;
	const number = Cypress._.random(1, 9999);

	let localPart = '';

	switch (Cypress._.random(0, 5)) {
		case 0:
			localPart = `${first}.${last}`;
			break;

		case 1:
			localPart = `${first}${separator}${last}${number}`;
			break;

		case 2:
			localPart = Cypress._.sample(prefixes)!;
			break;

		case 3:
			localPart = `${first.charAt(0)}${last}`;
			break;

		case 4:
			localPart = `${first}${number}`;
			break;

		case 5:
			localPart = `${Cypress._.sample(prefixes)!}-${Cypress._.sample(companies)!}`;
			break;
	}

	let domain = '';

	switch (Cypress._.random(0, 3)) {
		case 0:
			domain = `example${Cypress._.sample(tlds)!}`;
			break;

		case 1:
			domain = `${Cypress._.sample(companies)!}${Cypress._.sample(tlds)!}`;
			break;

		case 2:
			domain = `planning-inspectorate.gov.uk`;
			break;

		case 3:
			domain = `local-authority.gov.uk`;
			break;
	}

	let email = `${localPart}@${domain}`;
	const MAX_LENGTH = 250;
	if (email.length > MAX_LENGTH) {
		email = email.slice(0, MAX_LENGTH);
	}

	return email;
}
