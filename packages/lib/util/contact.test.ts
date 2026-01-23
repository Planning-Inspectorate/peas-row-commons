import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapContacts, handleContacts } from './contact.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';

describe('mapContacts', () => {
	it('should map properties correctly', () => {
		const mockContacts = [
			{
				id: 'obj-123',
				contactTypeId: CONTACT_TYPE_ID.OBJECTOR,
				firstName: 'John',
				lastName: 'Smith',
				orgName: 'Smith Co',
				telephoneNumber: '07000000000',
				email: 'john@example.com',
				objectorStatusId: 'status-valid',
				Address: { id: 'addr-1', line1: '1 High St' }
			}
		] as any;

		const result = mapContacts(mockContacts, 'objector');

		const mapped = result[0];
		assert.strictEqual(mapped.id, 'obj-123');
		assert.strictEqual(mapped.objectorFirstName, 'John');
		assert.strictEqual(mapped.objectorLastName, 'Smith');
		assert.strictEqual(mapped.objectorOrgName, 'Smith Co');

		assert.ok(mapped.objectorAddress);
	});
});

describe('handleContacts', () => {
	const MOCK_MAPPINGS = [
		{
			sourceKey: 'objectorDetails',
			prefix: 'objector',
			fixedTypeId: CONTACT_TYPE_ID.OBJECTOR,
			hasStatus: true,
			deleteFilter: { contactTypeId: CONTACT_TYPE_ID.OBJECTOR }
		},
		{
			sourceKey: 'generalContactDetails',
			prefix: 'contact',
			dynamicTypeField: 'contactType',
			hasStatus: false,
			deleteFilter: { contactTypeId: { not: CONTACT_TYPE_ID.OBJECTOR } }
		}
	] as any;

	it('should transform fixed-type contacts (Objectors) correctly', () => {
		const flatData = {
			objectorDetails: [
				{
					objectorFirstName: 'Jane',
					objectorLastName: 'Doe',
					objectorStatusId: 'valid-status',
					objectorAddress: { addressLine1: '123 Fake St' }
				}
			],
			someOtherKey: 'preserved'
		};

		const prismaPayload: Prisma.CaseUpdateInput = {};

		handleContacts(flatData, prismaPayload, MOCK_MAPPINGS);

		const contactsUpdate = prismaPayload.Contacts as any;
		assert.ok(contactsUpdate, 'Contacts object should be created');

		assert.deepStrictEqual(contactsUpdate.deleteMany.OR, [{ contactTypeId: CONTACT_TYPE_ID.OBJECTOR }]);

		assert.strictEqual(contactsUpdate.create.length, 1);
		const contact = contactsUpdate.create[0];
		assert.strictEqual(contact.firstName, 'Jane');
		assert.deepStrictEqual(contact.ContactType, { connect: { id: CONTACT_TYPE_ID.OBJECTOR } });
		assert.deepStrictEqual(contact.ObjectorStatus, { connect: { id: 'valid-status' } });
		assert.deepStrictEqual(contact.Address.create.line1, '123 Fake St');

		assert.strictEqual(flatData.objectorDetails, undefined);
		assert.strictEqual(flatData.someOtherKey, 'preserved');
	});

	it('should transform dynamic-type contacts (General Contacts) correctly', () => {
		const flatData = {
			generalContactDetails: [
				{
					contactFirstName: 'Bob',
					contactType: 'lpa-contact-id'
				}
			]
		};

		const prismaPayload: Prisma.CaseUpdateInput = {};

		handleContacts(flatData, prismaPayload, MOCK_MAPPINGS);

		const contactsUpdate = prismaPayload.Contacts as any;
		assert.ok(contactsUpdate);

		assert.strictEqual(contactsUpdate.create.length, 1);
		const contact = contactsUpdate.create[0];

		assert.deepStrictEqual(contact.ContactType, { connect: { id: 'lpa-contact-id' } });
		assert.strictEqual(contact.firstName, 'Bob');

		assert.strictEqual(contact.ObjectorStatus, undefined);
		assert.strictEqual(contact.Address, undefined);
	});

	it('should silently filter out contacts missing a type ID', () => {
		const flatData = {
			generalContactDetails: [{ contactFirstName: 'Bob', contactType: 'lpa-contact-id' }, { contactFirstName: 'Ghost' }]
		};

		const prismaPayload: Prisma.CaseUpdateInput = {};

		handleContacts(flatData, prismaPayload, MOCK_MAPPINGS);

		const contactsUpdate = prismaPayload.Contacts as any;

		assert.strictEqual(contactsUpdate.create.length, 1);
		assert.strictEqual(contactsUpdate.create[0].firstName, 'Bob');
	});

	it('should do nothing if flatData does not contain any contact keys', () => {
		const flatData = { randomKey: 'value' };
		const prismaPayload: Prisma.CaseUpdateInput = {};

		handleContacts(flatData, prismaPayload, MOCK_MAPPINGS);

		assert.strictEqual(prismaPayload.Contacts, undefined);
		assert.strictEqual(flatData.randomKey, 'value');
	});
});
