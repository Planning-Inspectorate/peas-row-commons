import type { Prisma } from 'packages/database/src/client/client.ts';
import { mapAddressDbToViewModel } from './address.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';

/**
 * Maps objectors DB data to view model.
 */
export function mapObjectors(contacts: Prisma.ContactGetPayload<{ include: { Address: true } }>[]) {
	const objectors = contacts.filter((contact) => contact.contactTypeId === CONTACT_TYPE_ID.OBJECTOR);

	return objectors.map((objector) => {
		return {
			id: objector.id,
			objectorFirstName: objector.firstName,
			objectorLastName: objector.lastName,
			objectorOrgName: objector.orgName,
			objectorTelephoneNumber: objector.telephoneNumber,
			objectorEmail: objector.email,
			objectorStatusId: objector.objectorStatusId,
			objectorAddress: mapAddressDbToViewModel(objector.Address)
		};
	});
}
