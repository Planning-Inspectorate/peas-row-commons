import { dateISOStringToDisplayDateAndTime } from './dates.ts';

/**
 * Formats an address object into a comma-separated string for audit display.
 */
export function formatAddress(address: Record<string, unknown> | null | undefined): string {
	if (!address) return '-';

	const parts = [
		address.line1 || address.addressLine1,
		address.line2 || address.addressLine2,
		address.townCity,
		address.county,
		address.postcode
	].filter(Boolean);

	return parts.length > 0 ? parts.join(', ') : '-';
}

/**
 * Formats a date + time value for audit display.
 */
export function formatDateTime(value: Date | string | null | undefined): string {
	if (!value) return '-';

	const date = value instanceof Date ? value : new Date(value);

	if (isNaN(date.getTime())) return '-';

	return dateISOStringToDisplayDateAndTime(value as Date);
}

/**
 * Formats a date value for audit display.
 */
export function formatDate(value: Date | string | null | undefined): string {
	if (!value) return '-';

	const date = value instanceof Date ? value : new Date(value);

	if (isNaN(date.getTime())) return '-';

	return date.toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * Formats a single value for audit display.
 * Returns `-` for null/undefined/empty.
 */
export function formatValue(value: unknown): string {
	if (value === null || value === undefined || value === '') {
		return '-';
	}

	if (value instanceof Date) {
		return formatDate(value);
	}

	if (typeof value === 'boolean') {
		return value ? 'Yes' : 'No';
	}

	return String(value);
}

/**
 * Formats a numeric value for audit display.
 */
export function formatNumber(value: unknown): string {
	if (value === null || value === undefined || value === '') return '-';
	return String(value);
}

/**
 * Formats a boolean to Yes/No for audit display.
 * Returns `-` for null/undefined to indicate no previous value.
 */
export function formatBoolean(value: boolean | null | undefined): string {
	if (value === null || value === undefined) return '-';
	return value ? 'Yes' : 'No';
}

/**
 * Normalises a 'yes'/'no' form string to 'Yes'/'No' for audit display.
 * The form submits lowercase strings; this ensures consistent comparison
 * against the boolean values from the DB.
 */
export function formatYesNo(value: string | null | undefined): string {
	if (!value) return '-';
	return value.toLowerCase() === 'yes' ? 'Yes' : 'No';
}

/**
 * Takes a value and formats it strictly as a GBP monetary unit.
 * Handles leading zeros, forces 2 decimal places, and adds comma separators.
 * A lot of this is blocked by validation already, but its worth doing here
 * as not all of it is blocked
 * e.g. 1234.5 -> £1,234.50
 * e.g. "00012.345" -> £12.35
 */
export function formatMonetaryValue(value: unknown): string {
	if (value === null || value === undefined || value === '') return '-';

	const numericValue = Number(value);

	if (Number.isNaN(numericValue)) return '-';

	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(numericValue);
}
