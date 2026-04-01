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
