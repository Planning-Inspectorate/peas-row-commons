import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveContactAudits, type ContactWithAddress } from './contact-resolver.ts';
import { AUDIT_ACTIONS } from '../actions.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-performing-action';

const APPLICANT_ACTIONS = {
	added: AUDIT_ACTIONS.APPLICANT_ADDED,
	updated: AUDIT_ACTIONS.APPLICANT_UPDATED,
	deleted: AUDIT_ACTIONS.APPLICANT_DELETED
};

const OBJECTOR_ACTIONS = {
	added: AUDIT_ACTIONS.OBJECTOR_ADDED,
	updated: AUDIT_ACTIONS.OBJECTOR_UPDATED,
	deleted: AUDIT_ACTIONS.OBJECTOR_DELETED
};

const CONTACT_ACTIONS = {
	added: AUDIT_ACTIONS.CONTACT_ADDED,
	updated: AUDIT_ACTIONS.CONTACT_UPDATED,
	deleted: AUDIT_ACTIONS.CONTACT_DELETED
};

function buildOldContact(overrides: Partial<Record<string, unknown>> = {}): ContactWithAddress {
	return {
		id: 'contact-1',
		firstName: 'John',
		lastName: 'Doe',
		orgName: null,
		email: 'example@exampledomain.co.uk',
		telephoneNumber: '123456789',
		contactTypeId: null,
		objectorStatusId: null,
		caseId: CASE_ID,
		Address: null,
		...overrides
	} as unknown as ContactWithAddress;
}

describe('resolveContactAudits', () => {
	describe('additions', () => {
		it('should detect a new contact being added', () => {
			const oldContacts: ContactWithAddress[] = [];
			const newContacts = [
				{
					id: 'new-1',
					applicantFirstName: 'John',
					applicantLastName: 'Doe',
					applicantOrgName: null
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.APPLICANT_ADDED);
			assert.strictEqual(entries[0].metadata?.name, 'John Doe');
		});

		it('should use orgName when first and last name are not provided', () => {
			const oldContacts: ContactWithAddress[] = [];
			const newContacts = [
				{
					id: 'new-1',
					applicantFirstName: null,
					applicantLastName: null,
					applicantOrgName: 'Acme Corp'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			assert.strictEqual(entries[0].metadata?.name, 'Acme Corp');
		});

		it('should return "-" when no name fields are provided', () => {
			const oldContacts: ContactWithAddress[] = [];
			const newContacts = [
				{
					id: 'new-1',
					applicantFirstName: null,
					applicantLastName: null,
					applicantOrgName: null
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			assert.strictEqual(entries[0].metadata?.name, '-');
		});
	});

	describe('deletions', () => {
		it('should detect a contact being removed', () => {
			const oldContacts = [buildOldContact()];
			const newContacts: Record<string, unknown>[] = [];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.APPLICANT_DELETED);
			assert.strictEqual(entries[0].metadata?.name, 'John Doe');
		});

		it('should detect the correct contact removed from the middle of a list', () => {
			const oldContacts = [
				buildOldContact({ id: 'c-1', firstName: 'Alice', lastName: 'Smith' }),
				buildOldContact({ id: 'c-2', firstName: 'Bob', lastName: 'Jones' }),
				buildOldContact({ id: 'c-3', firstName: 'Charlie', lastName: 'Brown' })
			];
			const newContacts = [
				{
					id: 'c-1',
					applicantFirstName: 'Alice',
					applicantLastName: 'Smith',
					applicantOrgName: null,
					applicantEmail: 'example@exampledomain.co.uk',
					applicantTelephoneNumber: '123456789'
				},
				{
					id: 'c-3',
					applicantFirstName: 'Charlie',
					applicantLastName: 'Brown',
					applicantOrgName: null,
					applicantEmail: 'example@exampledomain.co.uk',
					applicantTelephoneNumber: '123456789'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.APPLICANT_DELETED);
			assert.strictEqual(entries[0].metadata?.name, 'Bob Jones');
		});
	});

	describe('updates — name', () => {
		it('should detect a name change', () => {
			const oldContacts = [buildOldContact()];
			const newContacts = [
				{
					id: 'contact-1',
					applicantFirstName: 'Jane',
					applicantLastName: 'Smith',
					applicantOrgName: null,
					applicantEmail: 'example@exampledomain.co.uk',
					applicantTelephoneNumber: '123456789'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			const nameEntry = entries.find((e) => e.metadata?.fieldName === 'name');

			assert.ok(nameEntry);
			assert.strictEqual(nameEntry?.action, AUDIT_ACTIONS.APPLICANT_UPDATED);
			assert.strictEqual(nameEntry?.metadata?.entityName, 'John Doe');
			assert.strictEqual(nameEntry?.metadata?.oldValue, 'John Doe');
			assert.strictEqual(nameEntry?.metadata?.newValue, 'Jane Smith');
		});
	});

	describe('updates — address', () => {
		it('should detect an address change', () => {
			const oldContacts = [
				buildOldContact({
					Address: {
						line1: '221b Baker Street',
						townCity: 'London',
						postcode: 'NW1 6XE'
					}
				})
			];
			const newContacts = [
				{
					id: 'contact-1',
					applicantFirstName: 'John',
					applicantLastName: 'Doe',
					applicantOrgName: null,
					applicantEmail: 'example@exampledomain.co.uk',
					applicantTelephoneNumber: '123456789',
					applicantAddress: {
						addressLine1: 'Buckingham Palace',
						townCity: 'London',
						postcode: 'SW1'
					}
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			const addressEntry = entries.find((e) => e.metadata?.fieldName === 'address');

			assert.ok(addressEntry);
			assert.strictEqual(addressEntry?.metadata?.oldValue, '221b Baker Street, London, NW1 6XE');
			assert.strictEqual(addressEntry?.metadata?.newValue, 'Buckingham Palace, London, SW1');
		});
	});

	describe('updates — email', () => {
		it('should detect an email change', () => {
			const oldContacts = [buildOldContact()];
			const newContacts = [
				{
					id: 'contact-1',
					applicantFirstName: 'John',
					applicantLastName: 'Doe',
					applicantOrgName: null,
					applicantEmail: 'new@exampledomain.co.uk',
					applicantTelephoneNumber: '123456789'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			const emailEntry = entries.find((e) => e.metadata?.fieldName === 'email');

			assert.ok(emailEntry);
			assert.strictEqual(emailEntry?.metadata?.oldValue, 'example@exampledomain.co.uk');
			assert.strictEqual(emailEntry?.metadata?.newValue, 'new@exampledomain.co.uk');
		});
	});

	describe('updates — phone number', () => {
		it('should detect a phone number change', () => {
			const oldContacts = [buildOldContact()];
			const newContacts = [
				{
					id: 'contact-1',
					applicantFirstName: 'John',
					applicantLastName: 'Doe',
					applicantOrgName: null,
					applicantEmail: 'example@exampledomain.co.uk',
					applicantTelephoneNumber: '987654321'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			const phoneEntry = entries.find((e) => e.metadata?.fieldName === 'phone number');

			assert.ok(phoneEntry);
			assert.strictEqual(phoneEntry?.metadata?.oldValue, '123456789');
			assert.strictEqual(phoneEntry?.metadata?.newValue, '987654321');
		});
	});

	describe('updates — objector status', () => {
		it('should detect an objector status change with display names', () => {
			const oldContacts = [buildOldContact({ objectorStatusId: 'admissible' })];
			const newContacts = [
				{
					id: 'contact-1',
					objectorFirstName: 'John',
					objectorLastName: 'Doe',
					objectorOrgName: null,
					objectorEmail: 'example@exampledomain.co.uk',
					objectorTelephoneNumber: '123456789',
					objectorStatusId: 'upheld'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'objector', OBJECTOR_ACTIONS);

			const statusEntry = entries.find((e) => e.metadata?.fieldName === 'status');

			assert.ok(statusEntry);
			assert.strictEqual(statusEntry?.action, AUDIT_ACTIONS.OBJECTOR_UPDATED);
			// Display names resolved from OBJECTOR_STATUSES
			assert.ok(statusEntry?.metadata?.oldValue !== '-');
			assert.ok(statusEntry?.metadata?.newValue !== '-');
		});

		it('should not produce a status entry for applicants', () => {
			const oldContacts = [buildOldContact({ objectorStatusId: null })];
			const newContacts = [
				{
					id: 'contact-1',
					applicantFirstName: 'John',
					applicantLastName: 'Doe',
					applicantOrgName: null,
					applicantEmail: 'example@exampledomain.co.uk',
					applicantTelephoneNumber: '123456789'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			const statusEntry = entries.find((e) => e.metadata?.fieldName === 'status');
			assert.strictEqual(statusEntry, undefined);
		});
	});

	describe('updates — contact type', () => {
		it('should detect a contact type change with display names', () => {
			const oldContacts = [buildOldContact({ contactTypeId: 'acquiring-authority' })];
			const newContacts = [
				{
					id: 'contact-1',
					contactFirstName: 'John',
					contactLastName: 'Doe',
					contactOrgName: null,
					contactEmail: 'example@exampledomain.co.uk',
					contactTelephoneNumber: '123456789',
					contactTypeId: 'interested-owner'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'contact', CONTACT_ACTIONS);

			const typeEntry = entries.find((e) => e.metadata?.fieldName === 'contact type');

			assert.ok(typeEntry);
			assert.strictEqual(typeEntry?.action, AUDIT_ACTIONS.CONTACT_UPDATED);
		});

		it('should not produce a contact type entry for objectors', () => {
			const oldContacts = [buildOldContact({ contactTypeId: 'objector' })];
			const newContacts = [
				{
					id: 'contact-1',
					objectorFirstName: 'John',
					objectorLastName: 'Doe',
					objectorOrgName: null,
					objectorEmail: 'example@exampledomain.co.uk',
					objectorTelephoneNumber: '123456789',
					// contactTypeId stays the same for objectors
					contactTypeId: 'objector'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'objector', OBJECTOR_ACTIONS);

			const typeEntry = entries.find((e) => e.metadata?.fieldName === 'contact type');
			assert.strictEqual(typeEntry, undefined);
		});
	});

	describe('multiple sub-field changes', () => {
		it('should produce separate entries for each changed field', () => {
			const oldContacts = [buildOldContact()];
			const newContacts = [
				{
					id: 'contact-1',
					applicantFirstName: 'Jane',
					applicantLastName: 'Smith',
					applicantOrgName: null,
					applicantEmail: 'new@example.co.uk',
					applicantTelephoneNumber: '999999999',
					applicantAddress: {
						addressLine1: 'New Address',
						townCity: 'Manchester',
						postcode: 'M1 1AA'
					}
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			const fieldNames = entries.map((e) => e.metadata?.fieldName);

			assert.ok(fieldNames.includes('name'));
			assert.ok(fieldNames.includes('email'));
			assert.ok(fieldNames.includes('phone number'));
			assert.ok(fieldNames.includes('address'));
			assert.ok(entries.every((e) => e.action === AUDIT_ACTIONS.APPLICANT_UPDATED));
		});
	});

	describe('no changes', () => {
		it('should return no entries when all fields are identical', () => {
			const oldContacts = [buildOldContact()];
			const newContacts = [
				{
					id: 'contact-1',
					applicantFirstName: 'John',
					applicantLastName: 'Doe',
					applicantOrgName: null,
					applicantEmail: 'example@exampledomain.co.uk',
					applicantTelephoneNumber: '123456789'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			assert.strictEqual(entries.length, 0);
		});

		it('should return no entries when both lists are empty', () => {
			const entries = resolveContactAudits(CASE_ID, USER_ID, [], [], 'applicant', APPLICANT_ACTIONS);

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('prefix handling', () => {
		it('should use the correct prefix for objectors', () => {
			const oldContacts: ContactWithAddress[] = [];
			const newContacts = [
				{
					id: 'new-1',
					objectorFirstName: 'Test',
					objectorLastName: 'Objector',
					objectorOrgName: null
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'objector', OBJECTOR_ACTIONS);

			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.OBJECTOR_ADDED);
			assert.strictEqual(entries[0].metadata?.name, 'Test Objector');
		});

		it('should use the correct prefix for contacts', () => {
			const oldContacts: ContactWithAddress[] = [];
			const newContacts = [
				{
					id: 'new-1',
					contactFirstName: 'Test',
					contactLastName: 'Contact',
					contactOrgName: null
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'contact', CONTACT_ACTIONS);

			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.CONTACT_ADDED);
			assert.strictEqual(entries[0].metadata?.name, 'Test Contact');
		});
	});

	describe('combined operations', () => {
		it('should detect add, delete, and update in a single diff', () => {
			const oldContacts = [
				buildOldContact({ id: 'c-1', firstName: 'Alice', lastName: 'Smith' }),
				buildOldContact({ id: 'c-2', firstName: 'Bob', lastName: 'Jones' })
			];
			const newContacts = [
				{
					id: 'c-1',
					applicantFirstName: 'Alice',
					applicantLastName: 'Updated',
					applicantOrgName: null,
					applicantEmail: 'example@exampledomain.co.uk',
					applicantTelephoneNumber: '123456789'
				},
				{
					id: 'c-new',
					applicantFirstName: 'New',
					applicantLastName: 'Person',
					applicantOrgName: null
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			const added = entries.filter((e) => e.action === AUDIT_ACTIONS.APPLICANT_ADDED);
			const deleted = entries.filter((e) => e.action === AUDIT_ACTIONS.APPLICANT_DELETED);
			const updated = entries.filter((e) => e.action === AUDIT_ACTIONS.APPLICANT_UPDATED);

			assert.strictEqual(added.length, 1);
			assert.strictEqual(added[0].metadata?.name, 'New Person');

			assert.strictEqual(deleted.length, 1);
			assert.strictEqual(deleted[0].metadata?.name, 'Bob Jones');

			assert.strictEqual(updated.length, 1);
			assert.strictEqual(updated[0].metadata?.fieldName, 'name');
			assert.strictEqual(updated[0].metadata?.oldValue, 'Alice Smith');
			assert.strictEqual(updated[0].metadata?.newValue, 'Alice Updated');
		});
	});

	describe('metadata', () => {
		it('should include caseId and userId on all entries', () => {
			const oldContacts: ContactWithAddress[] = [];
			const newContacts = [
				{ id: 'new-1', applicantFirstName: 'Test', applicantLastName: 'User', applicantOrgName: null }
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			assert.strictEqual(entries[0].caseId, CASE_ID);
			assert.strictEqual(entries[0].userId, USER_ID);
		});

		it('should use old name as entityName for updates', () => {
			const oldContacts = [buildOldContact()];
			const newContacts = [
				{
					id: 'contact-1',
					applicantFirstName: 'Jane',
					applicantLastName: 'Smith',
					applicantOrgName: null,
					applicantEmail: 'example@exampledomain.co.uk',
					applicantTelephoneNumber: '123456789'
				}
			];

			const entries = resolveContactAudits(CASE_ID, USER_ID, oldContacts, newContacts, 'applicant', APPLICANT_ACTIONS);

			assert.strictEqual(entries[0].metadata?.entityName, 'John Doe');
		});
	});
});
