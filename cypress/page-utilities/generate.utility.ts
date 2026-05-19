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
 * - mostly lowercase letters
 * - some uppercase letters and numbers
 * - spaces and special characters
 * - max 2 special characters per string
 * - no adjacent special characters
 * - no matching bracket pairs like (test), [test], {test}, <test>
 * - spaces never at start/end
 */
export function generateRandomString(length: number): string {
	if (length <= 0) return '';

	// Weighted toward lowercase by repeating lowercase chars
	const lowercase = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz';
	const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const numbers = '0123456789';

	const specials = '!@£$%^&*()-_=+[]{};:\'",.<>?/\\|';
	const brackets = '()[]{}<>';

	const alphaNumeric = lowercase + uppercase + numbers;

	const getRandomChar = (chars: string): string => {
		return chars.charAt(Math.floor(Math.random() * chars.length));
	};

	let result = '';
	let specialCount = 0;
	let usedBracket = false;

	for (let i = 0; i < length; i++) {
		const isFirstOrLast = i === 0 || i === length - 1;

		const previousChar = result.charAt(result.length - 1);

		const previousWasSpecial = specials.includes(previousChar);
		const previousWasSpace = previousChar === ' ';

		const canUseSpace = !isFirstOrLast && !previousWasSpace;
		const canUseSpecial = !isFirstOrLast && specialCount < 2 && !previousWasSpecial;

		const useSpecial = canUseSpecial && Math.random() < 0.08;
		const useSpace = canUseSpace && !useSpecial && Math.random() < 0.12;

		if (useSpecial) {
			let availableSpecials = specials;

			// Prevent paired bracket patterns
			if (usedBracket) {
				availableSpecials = availableSpecials
					.split('')
					.filter((char) => !brackets.includes(char))
					.join('');
			}

			const char = getRandomChar(availableSpecials);

			result += char;
			specialCount++;

			if (brackets.includes(char)) {
				usedBracket = true;
			}

			continue;
		}

		if (useSpace) {
			result += ' ';
			continue;
		}

		result += getRandomChar(alphaNumeric);
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
 * Generates a random phone number:
 * - Either returns an empty string
 * - Plain number: 6 to 9 digits
 * - Prefix number: + followed by 6 to 9 digits
 * - Area code number: (XX) or (XXX), one space, then digits
 * - Prefix + area code number: +(XX) or +(XXX), one space, then digits
 * - Maximum total length is 14 characters including spaces
 */
export function generatePhoneNumber(): string {
	// 25% chance of returning no value
	if (Cypress._.random(0, 3) === 0) {
		return '';
	}

	const generateDigits = (length: number): string => {
		let value = '';

		for (let i = 0; i < length; i++) {
			value += Cypress._.random(0, 9);
		}

		return value;
	};

	const format = Cypress._.sample(['number', 'prefix', 'areaCode', 'prefixAreaCode'])!;

	if (format === 'number') {
		return generateDigits(Cypress._.random(6, 9));
	}

	if (format === 'prefix') {
		return `+${generateDigits(Cypress._.random(6, 9))}`;
	}

	const areaCodeLength = Cypress._.sample([2, 3])!;
	const areaCode = generateDigits(areaCodeLength);

	const maxMainDigitsLength =
		format === 'prefixAreaCode' ? 14 - 1 - 1 - areaCodeLength - 1 - 1 : 14 - 1 - areaCodeLength - 1 - 1;

	const mainDigitsLength = Cypress._.random(6, maxMainDigitsLength);
	const mainDigits = generateDigits(mainDigitsLength);

	if (format === 'areaCode') {
		return `(${areaCode}) ${mainDigits}`;
	}

	return `+(${areaCode}) ${mainDigits}`;
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
