/**
 * CSV builder for contact downloads.
 *
 * Formats an array of contacts into a CSV string with proper quoting.
 * Addresses are combined into a single cell with line breaks (\n)
 * so they display correctly when opened in Excel or Outlook.
 */

import type { PdfContact, PdfAddress } from '../case-download/index.ts';

const CSV_HEADERS = [
	'Contact type',
	'First Name',
	'Last Name',
	'Joint party / company name',
	'Address',
	'Email address',
	'Phone number',
	'Objector status'
] as const;

/**
 * Formats an address into a single string with line breaks.
 *
 * When wrapped in quotes in CSV, \n renders as line breaks in Excel.
 */
function formatAddress(address: PdfAddress | undefined): string {
	if (!address) {
		return '';
	}

	return [address.addressLine1, address.addressLine2, address.townCity, address.county, address.postcode]
		.filter(Boolean)
		.join('\n');
}

/**
 * Escapes a value for safe inclusion in a CSV cell.
 *
 * Wraps the value in double quotes if it contains commas, quotes,
 * or newlines. Any existing double quotes are doubled per RFC 4180.=
 */
function escapeCsvCell(value: string): string {
	if (!value) {
		return '';
	}

	// If the value contains special characters, wrap in quotes
	if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`;
	}

	return value;
}

/**
 * Converts a single contact into a CSV row string.
 */
function contactToCsvRow(contact: PdfContact & { contactType?: string }): string {
	const cells = [
		contact.contactType ?? '',
		contact.firstName ?? '',
		contact.lastName ?? '',
		contact.orgName ?? '',
		formatAddress(contact.address),
		contact.email ?? '',
		contact.telephoneNumber ?? '',
		contact.status ?? ''
	];

	return cells.map(escapeCsvCell).join(',');
}

/**
 * Builds a complete CSV string from an array of contacts.
 *
 * Includes a header row followed by one row per contact.
 * The output includes a UTF-8 BOM so Excel opens it with
 * correct encoding for special characters.
 */
export function buildContactsCsv(contacts: PdfContact[]): string {
	const headerRow = CSV_HEADERS.join(',');
	const dataRows = contacts.map(contactToCsvRow);

	// UTF-8 BOM ensures Excel interprets the file correctly
	const BOM = '\uFEFF';

	return BOM + [headerRow, ...dataRows].join('\r\n');
}
