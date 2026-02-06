import type { DateField, UkAddress } from '../types/standard.ts';
import { faker } from '@faker-js/faker';

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

	return `${lastSegment} - ${date} - ${time}`;
}

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

export function generateUkAddress(): UkAddress {
	return {
		line1: faker.helpers.maybe(() => faker.location.streetAddress(), { probability: 0.7 }),
		line2: faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.4 }),
		town: faker.helpers.maybe(() => faker.location.city(), { probability: 0.7 }),
		county: faker.helpers.maybe(() => faker.location.county(), { probability: 0.6 }),
		postcode: faker.helpers.maybe(
			() => faker.location.zipCode('??# #??'), // UK-style
			{ probability: 0.7 }
		)
	};
}
