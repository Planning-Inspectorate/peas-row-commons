/**
 * Standardises address objects from Prisma (line1) to UI (addressLine1)
 */
export function mapAddressDbToViewModel(address: any) {
	if (!address || typeof address !== 'object') return null;
	return {
		// We pass in `id` so that we can use it for upserting on save.
		id: address.id,
		addressLine1: address.line1,
		addressLine2: address.line2,
		townCity: address.townCity,
		county: address.county,
		postcode: formatPostcode(address.postcode)
	};
}

/**
 * Standardises address objects from UI (addressLine1) to Prisma (line1)
 */
export function mapAddressViewModelToDb(addressData: Record<string, any>) {
	if (!addressData || typeof addressData !== 'object') return undefined;
	return {
		line1: addressData.addressLine1 || '',
		line2: addressData.addressLine2 || '',
		townCity: addressData.townCity || '',
		county: addressData.county || '',
		postcode: formatPostcode(addressData.postcode) || ''
	};
}

/**
 * Standardises a postcode to uppercase with a single space before the inward code.
 * Examples: sw1a2aa  -> SW1A 2AA - ne301dp  -> NE30 1DP
 */
export function formatPostcode(postcode: string | undefined | null): string {
	if (!postcode) return '';

	const compact = postcode.replace(/\s+/g, '').toUpperCase();

	// Fallback for malformed or partial postcodes from legacy database data.
	// Normal input should be validated at the boundary.
	if (compact.length <= 3) {
		return compact;
	}

	return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}
