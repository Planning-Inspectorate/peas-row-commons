/**
 * Standardises address objects from Prisma (line1) to UI (addressLine1)
 */
export function mapAddressDbToViewModel(address: any) {
	if (!address || typeof address !== 'object') return null;
	return {
		addressLine1: address.line1,
		addressLine2: address.line2,
		townCity: address.townCity,
		county: address.county,
		postcode: address.postcode
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
		postcode: addressData.postcode || ''
	};
}
