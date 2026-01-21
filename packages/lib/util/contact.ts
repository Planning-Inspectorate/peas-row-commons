import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';
import { mapAddressDbToViewModel } from './address.ts';

/**
 * Maps objectors DB data to view model.
 */
export function mapContacts(contacts: Prisma.ContactGetPayload<{ include: { Address: true } }>[], key: string) {
	return contacts.map((contact) => {
		return {
			id: contact.id,
			[`${key}FirstName`]: contact.firstName,
			[`${key}LastName`]: contact.lastName,
			[`${key}OrgName`]: contact.orgName,
			[`${key}TelephoneNumber`]: contact.telephoneNumber,
			[`${key}Email`]: contact.email,
			[`${key}Address`]: mapAddressDbToViewModel(contact.Address),
			// Objector status and Contact type are unique
			objectorStatusId: contact.objectorStatusId,
			contactTypeId: contact.contactTypeId
		};
	});
}

/**
 * Used for creating the contacts in handleContacts
 */
export const CONTACT_MAPPINGS = [
	{
		sourceKey: 'objectorDetails',
		prefix: 'objector',
		fixedTypeId: CONTACT_TYPE_ID.OBJECTOR,
		hasStatus: true,
		deleteFilter: { contactTypeId: CONTACT_TYPE_ID.OBJECTOR }
	},
	{
		sourceKey: 'contactDetails',
		prefix: 'contact',
		dynamicTypeField: 'contactTypeId',
		hasStatus: false,
		deleteFilter: { contactTypeId: { not: CONTACT_TYPE_ID.OBJECTOR } }
	}
];

/**
 * Creates & deletes contacts based on the mappings above, currently either creates more "generic" contacts
 * or "objectors" which are contacts with their own section in the UI.
 */
export function handleContacts(
	flatData: Record<string, any>,
	prismaPayload: Prisma.CaseUpdateInput,
	contactMappings: typeof CONTACT_MAPPINGS
) {
	const deleteFilters: { contactTypeId: string | { not: string } }[] = [];
	const allNewContacts: Prisma.ContactCreateWithoutCaseInput[] = [];

	contactMappings.forEach((config) => {
		if (!Object.hasOwn(flatData, config.sourceKey)) return;

		const items = flatData[config.sourceKey];
		const { prefix } = config;

		const mappedContacts = items
			.map((item: Record<string, any>) => {
				// If there is a fixed type id, e.g. in Objector, use that
				// otherwise grab the user-chosen type.
				const typeId = config.fixedTypeId ?? item[config.dynamicTypeField];

				if (!typeId) return null;

				const contact: Prisma.ContactCreateWithoutCaseInput = {
					ContactType: { connect: { id: typeId } },
					firstName: item[`${prefix}FirstName`],
					lastName: item[`${prefix}LastName`],
					orgName: item[`${prefix}OrgName`],
					telephoneNumber: item[`${prefix}TelephoneNumber`],
					email: item[`${prefix}Email`]
				};

				// Specific check for Objector which has it's own column 'objectorStatusId'
				if (config.hasStatus && item[`${prefix}StatusId`]) {
					contact.ObjectorStatus = { connect: { id: item[`${prefix}StatusId`] } };
				}

				const address = item[`${prefix}Address`];
				if (address) {
					contact.Address = {
						create: {
							line1: address.addressLine1,
							line2: address.addressLine2,
							townCity: address.townCity,
							county: address.county,
							postcode: address.postcode
						}
					};
				}

				return contact;
			})
			.filter(Boolean);

		deleteFilters.push(config.deleteFilter);
		allNewContacts.push(...mappedContacts);

		delete flatData[config.sourceKey];
	});

	if (deleteFilters.length > 0) {
		prismaPayload.Contacts = {
			deleteMany: {
				OR: deleteFilters
			},
			create: allNewContacts
		};
	}
}
