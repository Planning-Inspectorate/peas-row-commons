import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AUDIT_ACTIONS } from '../actions.ts';
import { resolveSiteAddressAudits, type CaseToAddressWithAddress } from './site-address-resolver.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-performing-action';

function buildOldSiteAddress(id: string, address: Partial<Record<string, unknown>>): CaseToAddressWithAddress {
	return {
		id,
		caseId: CASE_ID,
		addressId: `${id}-address`,
		Address: {
			id: `${id}-address`,
			line1: null,
			line2: null,
			townCity: null,
			county: null,
			postcode: null,
			...address
		}
	} as unknown as CaseToAddressWithAddress;
}

describe('resolveSiteAddressAudits', () => {
	describe('additions', () => {
		it('should detect a new site address as added', () => {
			const oldAddresses: CaseToAddressWithAddress[] = [];
			const newAddresses = [
				{ id: 'cta-1', siteAddress: { addressLine1: '1 High St', townCity: 'London', postcode: 'SW1 1AA' } }
			];

			const entries = resolveSiteAddressAudits(CASE_ID, USER_ID, oldAddresses, newAddresses);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.SITE_ADDRESS_ADDED);
			assert.strictEqual(entries[0].metadata?.newValue, '1 High St, London, SW1 1AA');
		});

		it('should ignore new rows without an id', () => {
			// This cannot happen in normal operation because the form requires an id for each address
			const oldAddresses: CaseToAddressWithAddress[] = [];
			const newAddresses = [{ siteAddress: { addressLine1: '1 High St' } }];

			// @ts-expect-error -- testing invalid input (no id)
			const entries = resolveSiteAddressAudits(CASE_ID, USER_ID, oldAddresses, newAddresses);

			assert.strictEqual(entries.length, 0);
		});

		it('should not report a new row without a site address as added', () => {
			const oldAddresses: CaseToAddressWithAddress[] = [];
			const newAddresses = [{ id: 'cta-1' }];

			const entries = resolveSiteAddressAudits(CASE_ID, USER_ID, oldAddresses, newAddresses);

			assert.strictEqual(entries.length, 0);
		});
	});

	describe('deletions', () => {
		it('should detect a site address being removed', () => {
			const oldAddresses = [buildOldSiteAddress('cta-1', { line1: '1 High St', townCity: 'London' })];
			const newAddresses: { id: string; siteAddress?: Record<string, unknown> | null }[] = [];

			const entries = resolveSiteAddressAudits(CASE_ID, USER_ID, oldAddresses, newAddresses);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.SITE_ADDRESS_DELETED);
			assert.strictEqual(entries[0].metadata?.oldValue, '1 High St, London');
		});

		it('should treat an existing address with no submitted site address as deleted', () => {
			// This cannot happen in normal operation because addresses are required.
			const oldAddresses = [buildOldSiteAddress('matched-id', { line1: '1 High St', townCity: 'London' })];
			const newAddresses = [{ id: 'matched-id' }];

			const entries = resolveSiteAddressAudits(CASE_ID, USER_ID, oldAddresses, newAddresses);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.SITE_ADDRESS_DELETED);
			assert.strictEqual(entries[0].metadata?.oldValue, '1 High St, London');
		});
	});

	describe('updates', () => {
		it('should detect an address change for a matching id', () => {
			const oldAddresses = [buildOldSiteAddress('cta-1', { line1: '1 High St', townCity: 'London' })];
			const newAddresses = [{ id: 'cta-1', siteAddress: { addressLine1: '2 Low St', townCity: 'London' } }];

			const entries = resolveSiteAddressAudits(CASE_ID, USER_ID, oldAddresses, newAddresses);

			assert.strictEqual(entries.length, 1);
			assert.strictEqual(entries[0].action, AUDIT_ACTIONS.SITE_ADDRESS_UPDATED);
			assert.strictEqual(entries[0].metadata?.oldValue, '1 High St, London');
			assert.strictEqual(entries[0].metadata?.newValue, '2 Low St, London');
		});

		it('should not create an entry when the address is unchanged', () => {
			const oldAddresses = [buildOldSiteAddress('cta-1', { line1: '1 High St', townCity: 'London' })];
			const newAddresses = [{ id: 'cta-1', siteAddress: { addressLine1: '1 High St', townCity: 'London' } }];

			const entries = resolveSiteAddressAudits(CASE_ID, USER_ID, oldAddresses, newAddresses);

			assert.strictEqual(entries.length, 0);
		});
	});
});
