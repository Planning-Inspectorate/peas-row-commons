import { REMOVED_USER, UNKNOWN_USER } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getUserDisplayName } from './entra-groups.ts';

describe('entra-groups', () => {
	describe('getUserDisplayName', () => {
		it('should return fallback when userId is null', () => {
			const userMap = new Map<string, string>();
			assert.strictEqual(getUserDisplayName(userMap, null), UNKNOWN_USER);
		});

		it('should return fallback when userId is undefined', () => {
			const userMap = new Map<string, string>();
			assert.strictEqual(getUserDisplayName(userMap, undefined), UNKNOWN_USER);
		});

		it('should return fallback when userId is not a valid UUID format', () => {
			const userMap = new Map<string, string>([['0001', 'John Smith']]);
			assert.strictEqual(getUserDisplayName(userMap, '0001'), UNKNOWN_USER);
		});

		it('should return a custom fallback when provided and userId is invalid', () => {
			const userMap = new Map<string, string>();
			assert.strictEqual(getUserDisplayName(userMap, null, 'Custom fallback'), 'Custom fallback');
		});

		it('should return "Removed user" when userId is a valid UUID that is no longer in the map (e.g. user removed from Entra)', () => {
			const activeUserId = 'a1b2c442-98fc-1c14-9afb-ab1234567891';
			const removedUserId = 'e3b0c442-98fc-1c14-9afb-ab1234567890';

			// Jane Doe is still active/present in the map, but the removed user's ID
			// is no longer resolvable - simulating a user who existed before but has
			// since been removed from the Entra group/directory.
			const userMap = new Map<string, string>([[activeUserId, 'Jane Doe']]);

			assert.strictEqual(getUserDisplayName(userMap, removedUserId), REMOVED_USER);
		});

		it('should return the display name when userId is a valid UUID and found in the map', () => {
			const activeUserId = 'e3b0c442-98fc-1c14-9afb-ab1234567890';
			const userMap = new Map<string, string>([[activeUserId, 'Jane Doe']]);
			assert.strictEqual(getUserDisplayName(userMap, activeUserId), 'Jane Doe');
		});

		it('should return the "(Inactive)" display name for users outside the group but still in Entra', () => {
			const inactiveUserId = 'e3b0c442-98fc-1c14-9afb-ab1234567890';
			const userMap = new Map<string, string>([[inactiveUserId, 'Jane Doe (Inactive)']]);
			assert.strictEqual(getUserDisplayName(userMap, inactiveUserId), 'Jane Doe (Inactive)');
		});
	});
});
