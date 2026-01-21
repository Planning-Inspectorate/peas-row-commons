import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapObjectors } from './contact.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';

describe('mapObjectors', () => {
	it('should filter objectors and map properties correctly', () => {
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
			},
			{
				id: 'agent-456',
				contactTypeId: 'agent',
				firstName: 'Alice',
				Address: null
			}
		];

		const result = mapObjectors(mockContacts);

		assert.strictEqual(result.length, 1);

		const mapped = result[0];
		assert.strictEqual(mapped.id, 'obj-123');
		assert.strictEqual(mapped.objectorFirstName, 'John');
		assert.strictEqual(mapped.objectorLastName, 'Smith');
		assert.strictEqual(mapped.objectorOrgName, 'Smith Co');

		assert.ok(mapped.objectorAddress);
	});

	it('should return an empty array if no objectors exist', () => {
		const mockContacts = [
			{ id: '1', contactTypeId: 'agent', Address: null },
			{ id: '2', contactTypeId: 'lpa', Address: null }
		];

		const result = mapObjectors(mockContacts);

		assert.deepStrictEqual(result, []);
	});
});
