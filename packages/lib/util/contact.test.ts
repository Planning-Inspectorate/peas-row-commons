import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapContacts, handleContacts, createPersonQuestions } from './contact.ts';
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

describe('createPersonQuestions', () => {
	it('should generate person questions with the correct dynamic keys and text', () => {
		const result = createPersonQuestions({
			section: 'applicantDetails',
			db: 'applicant',
			url: 'applicant',
			label: 'Applicant',
			hint: 'Custom hint text'
		});

		assert.ok(result.applicantDetailsName);
		assert.ok(result.applicantDetailsAddress);
		assert.ok(result.applicantDetailsContactDetails);

		assert.strictEqual(result.applicantDetailsName.title, 'Applicant');
		assert.strictEqual(result.applicantDetailsName.question, 'Who is the applicant?');
		assert.strictEqual(result.applicantDetailsName.hint, 'Custom hint text');

		assert.strictEqual(result.applicantDetailsContactDetails.title, 'Applicant contact details');
		assert.strictEqual(result.applicantDetailsContactDetails.question, 'Applicant contact details (optional)');
	});

	it('should adjust title and question text when the label is exactly "Contact"', () => {
		const result = createPersonQuestions({
			section: 'contact',
			db: 'contact',
			url: 'contact',
			label: 'Contact'
		});

		const contactDetails = result.contactContactDetails;

		assert.strictEqual(contactDetails.title, 'Contact details');
		assert.strictEqual(contactDetails.question, 'What are the contact details? (optional)');
	});

	it('should correctly prefix database fields in the input fields array', () => {
		const result = createPersonQuestions({
			section: 'agent',
			db: 'agentDbPrefix',
			url: 'agent',
			label: 'Agent'
		});

		const nameInputFields = result.agentName.inputFields as { fieldName: string }[];
		const contactInputFields = result.agentContactDetails.inputFields as { fieldName: string }[];

		assert.strictEqual(nameInputFields[0].fieldName, 'agentDbPrefixFirstName');
		assert.strictEqual(nameInputFields[1].fieldName, 'agentDbPrefixLastName');
		assert.strictEqual(nameInputFields[2].fieldName, 'agentDbPrefixOrgName');

		assert.strictEqual(contactInputFields[0].fieldName, 'agentDbPrefixEmail');
		assert.strictEqual(contactInputFields[1].fieldName, 'agentDbPrefixTelephoneNumber');
	});

	it('should use a default hint if one is not provided', () => {
		const result = createPersonQuestions({
			section: 'appellant',
			db: 'appellant',
			url: 'appellant',
			label: 'Appellant'
		});

		assert.strictEqual(result.appellantName.hint, 'Enter the name of the individual, the organisation, or both.');
	});
});
