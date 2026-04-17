import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { resolveFieldValues } from './field-resolver.ts';

const CASE_ID = 'case-1';

describe('resolveFieldValues', () => {
	describe('default resolver (simple scalar fields)', () => {
		it('should return old and new string values for a matching field name', () => {
			const previousCase = { externalReference: 'ABC/123' };
			const result = resolveFieldValues('externalReference', previousCase, 'DEF/345');

			assert.strictEqual(result.oldValue, 'ABC/123');
			assert.strictEqual(result.newValue, 'DEF/345');
		});

		it('should return "-" for null old value', () => {
			const previousCase = { externalReference: null };
			const result = resolveFieldValues('externalReference', previousCase, 'DEF/345');

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, 'DEF/345');
		});

		it('should return "-" for undefined old value', () => {
			const previousCase = {};
			const result = resolveFieldValues('externalReference', previousCase, 'DEF/345');

			assert.strictEqual(result.oldValue, '-');
		});

		it('should return "-" for empty string value', () => {
			const previousCase = { name: '' };
			const result = resolveFieldValues('name', previousCase, 'New Name');

			assert.strictEqual(result.oldValue, '-');
		});

		it('should return "-" for null new value', () => {
			const previousCase = { name: 'Old Name' };
			const result = resolveFieldValues('name', previousCase, null);

			assert.strictEqual(result.oldValue, 'Old Name');
			assert.strictEqual(result.newValue, '-');
		});

		it('should format Date objects', () => {
			const previousCase = { receivedDate: new Date('2026-03-14T00:00:00.000Z') };
			const result = resolveFieldValues('receivedDate', previousCase, 'new-value');

			assert.strictEqual(result.oldValue, '14 March 2026');
		});

		it('should format boolean true as "Yes"', () => {
			const previousCase = { isFencingPermanent: true };
			const result = resolveFieldValues('isFencingPermanent', previousCase, false);

			assert.strictEqual(result.oldValue, 'Yes');
			assert.strictEqual(result.newValue, 'No');
		});

		it('should stringify numbers', () => {
			const previousCase = { someNumber: 42 };
			const result = resolveFieldValues('someNumber', previousCase, 100);

			assert.strictEqual(result.oldValue, '42');
			assert.strictEqual(result.newValue, '100');
		});
	});

	describe('act resolver', () => {
		it('should resolve act composite IDs to display names', () => {
			const previousCase = {
				actId: 'electricity-1989',
				sectionId: null
			};
			// The form submits the composite ID from ACT_SECTIONS
			const newAnswer = 'gas-1986';

			const result = resolveFieldValues('act', previousCase, newAnswer);

			assert.strictEqual(result.oldValue, 'Electricity Act 1989');
			assert.strictEqual(result.newValue, 'Gas Act 1986');
		});

		it('should resolve act with section', () => {
			const previousCase = {
				actId: 'highways-1980',
				sectionId: '26'
			};
			const newAnswer = 'highways-1980-118';

			const result = resolveFieldValues('act', previousCase, newAnswer);

			assert.strictEqual(result.oldValue, 'Highways Act 1980, 26');
			assert.strictEqual(result.newValue, 'Highways Act 1980, 118');
		});

		it('should return "-" when old act is not found', () => {
			const previousCase = { actId: null, sectionId: null };
			const newAnswer = 'gas-1986';

			const result = resolveFieldValues('act', previousCase, newAnswer);

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, 'Gas Act 1986');
		});

		it('should return "-" when new act is not found', () => {
			const previousCase = { actId: 'electricity-1989', sectionId: null };
			const result = resolveFieldValues('act', previousCase, null);

			assert.strictEqual(result.oldValue, 'Electricity Act 1989');
			assert.strictEqual(result.newValue, '-');
		});
	});

	describe('statusId resolver', () => {
		it('should resolve status IDs to display names', () => {
			const previousCase = { statusId: 'new-case' };
			const result = resolveFieldValues('statusId', previousCase, 'closed');

			assert.ok(result.oldValue !== '-');
			assert.ok(result.newValue !== '-');
		});

		it('should return "-" for unknown status ID', () => {
			const previousCase = { statusId: 'non-existent-id' };
			const result = resolveFieldValues('statusId', previousCase, 'also-non-existent');

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, '-');
		});

		it('should return "-" for null status', () => {
			const previousCase = { statusId: null };
			const result = resolveFieldValues('statusId', previousCase, 'new-case');

			assert.strictEqual(result.oldValue, '-');
		});
	});

	describe('priorityId resolver', () => {
		it('should resolve priority IDs to display names', () => {
			const previousCase = { priorityId: 'high' };
			const result = resolveFieldValues('priorityId', previousCase, 'low');

			assert.ok(result.oldValue !== '-');
			assert.ok(result.newValue !== '-');
		});

		it('should return "-" for null priority', () => {
			const previousCase = { priorityId: null };
			const result = resolveFieldValues('priorityId', previousCase, 'high');

			assert.strictEqual(result.oldValue, '-');
		});
	});

	describe('advertisedModificationId resolver', () => {
		it('should return "-" for null advertised modification', () => {
			const previousCase = { advertisedModificationId: null };
			const result = resolveFieldValues('advertisedModificationId', previousCase, null);

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, '-');
		});
	});

	describe('inspectorBandId resolver', () => {
		it('should return "-" for null inspector band', () => {
			const previousCase = { inspectorBandId: null };
			const result = resolveFieldValues('inspectorBandId', previousCase, null);

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, '-');
		});
	});

	describe('authorityId resolver', () => {
		it('should resolve authority ID to authority name', () => {
			// Uses dev authorities as fallback — pick an ID from AUTHORITIES_DEV
			const previousCase = { authorityId: null };
			const result = resolveFieldValues('authorityId', previousCase, 'some-unknown-id');

			assert.strictEqual(result.oldValue, '-');
			// newValue depends on whether the ID exists in the dev data
		});

		it('should return "-" when authority is not found', () => {
			const previousCase = { authorityId: 'non-existent' };
			const result = resolveFieldValues('authorityId', previousCase, 'also-non-existent');

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, '-');
		});
	});

	describe('siteAddress resolver', () => {
		it('should format DB-shaped address to display string', () => {
			const previousCase = {
				SiteAddress: {
					line1: '221b Baker Street',
					line2: null,
					townCity: 'London',
					county: null,
					postcode: 'NW1 6XE'
				}
			};
			const newAnswer = {
				addressLine1: 'Buckingham Palace',
				addressLine2: null,
				townCity: 'London',
				county: null,
				postcode: 'SW1'
			};

			const result = resolveFieldValues('siteAddress', previousCase, newAnswer);

			assert.strictEqual(result.oldValue, '221b Baker Street, London, NW1 6XE');
			assert.strictEqual(result.newValue, 'Buckingham Palace, London, SW1');
		});

		it('should return "-" when old address is null', () => {
			const previousCase = { SiteAddress: null };
			const newAnswer = {
				addressLine1: '10 Downing Street',
				townCity: 'London',
				postcode: 'SW1A 2AA'
			};

			const result = resolveFieldValues('siteAddress', previousCase, newAnswer);

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, '10 Downing Street, London, SW1A 2AA');
		});

		it('should return "-" when new address is null', () => {
			const previousCase = {
				SiteAddress: {
					line1: '221b Baker Street',
					townCity: 'London',
					postcode: 'NW1 6XE'
				}
			};

			const result = resolveFieldValues('siteAddress', previousCase, null);

			assert.strictEqual(result.oldValue, '221b Baker Street, London, NW1 6XE');
			assert.strictEqual(result.newValue, '-');
		});
	});

	describe('caseOfficerId resolver', () => {
		const userDisplayNameMap = new Map([
			['entra-1', 'John Doe'],
			['entra-2', 'Jane Smith']
		]);

		it('should resolve Entra IDs to display names', () => {
			const previousCase = {
				CaseOfficer: { idpUserId: 'entra-1' }
			};

			const result = resolveFieldValues('caseOfficerId', previousCase, 'entra-2', { userDisplayNameMap });

			assert.strictEqual(result.oldValue, 'John Doe');
			assert.strictEqual(result.newValue, 'Jane Smith');
		});

		it('should return "-" when old case officer is null', () => {
			const previousCase = { CaseOfficer: null };

			const result = resolveFieldValues('caseOfficerId', previousCase, 'entra-1', { userDisplayNameMap });

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, 'John Doe');
		});

		it('should return "-" when new case officer is null', () => {
			const previousCase = {
				CaseOfficer: { idpUserId: 'entra-1' }
			};

			const result = resolveFieldValues('caseOfficerId', previousCase, null, { userDisplayNameMap });

			assert.strictEqual(result.oldValue, 'John Doe');
			assert.strictEqual(result.newValue, '-');
		});

		it('should return "-" when no context is provided', () => {
			const previousCase = {
				CaseOfficer: { idpUserId: 'entra-1' }
			};

			const result = resolveFieldValues('caseOfficerId', previousCase, 'entra-2');

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, '-');
		});

		it('should return "-" when Entra ID is not in the display name map', () => {
			const previousCase = {
				CaseOfficer: { idpUserId: 'unknown-id' }
			};

			const result = resolveFieldValues('caseOfficerId', previousCase, 'also-unknown', { userDisplayNameMap });

			assert.strictEqual(result.oldValue, '-');
			assert.strictEqual(result.newValue, '-');
		});
	});

	describe('unknown fields fall through to default resolver', () => {
		it('should use default resolver for unregistered field names', () => {
			const previousCase = { someRandomField: 'old' };
			const result = resolveFieldValues('someRandomField', previousCase, 'new');

			assert.strictEqual(result.oldValue, 'old');
			assert.strictEqual(result.newValue, 'new');
		});
	});
});
