import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapContacts } from './contact.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';

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
