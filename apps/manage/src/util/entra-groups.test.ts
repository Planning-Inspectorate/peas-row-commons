import { REMOVED_USER, UNKNOWN_USER } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { buildUserDisplayNameMap, getNonEntraGroupUsers } from './entra-groups.ts';

describe('entra-groups', () => {
	describe('getNonEntraGroupUsers', () => {
		it('should return null and log a warning when no Entra client is available', async () => {
			const logger = mockLogger();
			const initClient = mock.fn(() => null);

			const result = await getNonEntraGroupUsers({
				logger,
				initClient: initClient as any,
				session: {} as any,
				userIds: ['e3b0c442-98fc-1c14-9afb-ab1234567890']
			});

			assert.strictEqual(result, null);
			assert.strictEqual(logger.warn.mock.callCount(), 1);
		});

		it('should return an empty array without calling the client when userIds is empty', async () => {
			const logger = mockLogger();
			const listUsersByIds = mock.fn(async () => []);
			const initClient = mock.fn(() => ({ listUsersByIds }));

			const result = await getNonEntraGroupUsers({
				logger,
				initClient: initClient as any,
				session: {} as any,
				userIds: []
			});

			assert.deepStrictEqual(result, []);
			assert.strictEqual(listUsersByIds.mock.callCount(), 0);
		});

		it('should return the resolved users when the client lookup succeeds', async () => {
			const logger = mockLogger();
			const userId = 'e3b0c442-98fc-1c14-9afb-ab1234567890';
			const listUsersByIds = mock.fn(async () => [{ id: userId, displayName: 'Jane Doe' }]);
			const initClient = mock.fn(() => ({ listUsersByIds }));

			const result = await getNonEntraGroupUsers({
				logger,
				initClient: initClient as any,
				session: {} as any,
				userIds: [userId]
			});

			assert.deepStrictEqual(result, [{ id: userId, displayName: 'Jane Doe' }]);
		});

		it('should return an empty array (not null) when the lookup succeeds but finds no matches', async () => {
			const logger = mockLogger();
			const listUsersByIds = mock.fn(async () => []);
			const initClient = mock.fn(() => ({ listUsersByIds }));

			const result = await getNonEntraGroupUsers({
				logger,
				initClient: initClient as any,
				session: {} as any,
				userIds: ['e3b0c442-98fc-1c14-9afb-ab1234567890']
			});

			assert.deepStrictEqual(result, []);
		});

		it('should return null and log an error when the client lookup throws', async () => {
			const logger = mockLogger();
			const listUsersByIds = mock.fn(async () => {
				throw new Error('Graph API outage');
			});
			const initClient = mock.fn(() => ({ listUsersByIds }));

			const result = await getNonEntraGroupUsers({
				logger,
				initClient: initClient as any,
				session: {} as any,
				userIds: ['e3b0c442-98fc-1c14-9afb-ab1234567890']
			});

			assert.strictEqual(result, null);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});
	});

	describe('buildUserDisplayNameMap', () => {
		const groupMembers = { allUsers: [], caseOfficers: [], inspectors: [] };

		it('should set REMOVED_USER for a valid UUID confirmed absent after a successful lookup', async () => {
			const removedUserId = 'e3b0c442-98fc-1c14-9afb-ab1234567890';
			const logger = mockLogger();
			const initClient = mock.fn(() => ({ listUsersByIds: async () => [] }));

			const userMap = await buildUserDisplayNameMap(groupMembers as any, [removedUserId], {
				logger,
				initClient: initClient as any,
				session: {}
			});

			assert.strictEqual(userMap.get(removedUserId), REMOVED_USER);
		});

		it('should set UNKNOWN_USER (not REMOVED_USER) for a valid UUID when there is no Entra client', async () => {
			const userId = 'e3b0c442-98fc-1c14-9afb-ab1234567890';
			const logger = mockLogger();
			const initClient = mock.fn(() => null);

			const userMap = await buildUserDisplayNameMap(groupMembers as any, [userId], {
				logger,
				initClient: initClient as any,
				session: {}
			});

			assert.strictEqual(userMap.get(userId), UNKNOWN_USER);
		});

		it('should set UNKNOWN_USER (not REMOVED_USER) for a valid UUID when the Entra lookup throws', async () => {
			const userId = 'e3b0c442-98fc-1c14-9afb-ab1234567890';
			const logger = mockLogger();
			const initClient = mock.fn(() => ({
				listUsersByIds: async () => {
					throw new Error('Graph API outage');
				}
			}));

			const userMap = await buildUserDisplayNameMap(groupMembers as any, [userId], {
				logger,
				initClient: initClient as any,
				session: {}
			});

			assert.strictEqual(userMap.get(userId), UNKNOWN_USER);
		});

		it('should set UNKNOWN_USER for a non-UUID-format id regardless of lookup outcome', async () => {
			const logger = mockLogger();
			const initClient = mock.fn(() => ({ listUsersByIds: async () => [] }));

			const userMap = await buildUserDisplayNameMap(groupMembers as any, ['not-a-uuid'], {
				logger,
				initClient: initClient as any,
				session: {}
			});

			assert.strictEqual(userMap.get('not-a-uuid'), UNKNOWN_USER);
		});

		it('should resolve a matched user to their real display name', async () => {
			const userId = 'e3b0c442-98fc-1c14-9afb-ab1234567890';
			const logger = mockLogger();
			const initClient = mock.fn(() => ({
				listUsersByIds: async () => [{ id: userId, displayName: 'Jane Doe' }]
			}));

			const userMap = await buildUserDisplayNameMap(groupMembers as any, [userId], {
				logger,
				initClient: initClient as any,
				session: {}
			});

			assert.strictEqual(userMap.get(userId), 'Jane Doe');
		});
	});
});
