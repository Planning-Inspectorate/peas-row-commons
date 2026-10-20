import { REMOVED_USER, UNKNOWN_USER } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { buildInitEntraClient, CachedEntraClient } from './cached-entra-client.ts';

describe('cached-entra-client', () => {
	describe('buildInitEntraClient', () => {
		it('should return null if auth not enabled', () => {
			const initEntraClient = buildInitEntraClient(false, {} as any);
			assert.strictEqual(initEntraClient({}), null);
		});
		it('should return a client if auth enabled', () => {
			const initEntraClient = buildInitEntraClient(true, {} as any);
			let client;
			assert.doesNotThrow(() => {
				client = initEntraClient({
					account: { accessToken: 'token-1' }
				});
			});
			assert.notStrictEqual(client, null);
			assert.strictEqual(typeof (client as any).listAllGroupMembers === 'function', true);
		});
	});
	describe('CachedEntraClient', () => {
		describe('listAllGroupMembers', () => {
			it('should return cached entry if present', async () => {
				const cacheMock = {
					get: mock.fn(() => [1, 2, 3])
				};
				const clientMock = {};
				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);
				const members = await cacheClient.listAllGroupMembers('group-1');
				assert.strictEqual(cacheMock.get.mock.callCount(), 1);
				assert.deepStrictEqual(members, [1, 2, 3]);
			});
			it('should fetch new value if no cache value', async () => {
				const cacheMock = {
					get: mock.fn(),
					set: mock.fn()
				};
				const clientMock = {
					listAllGroupMembers: mock.fn(() => [5, 6, 7])
				};
				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);
				const members = await cacheClient.listAllGroupMembers('group-1');
				assert.deepStrictEqual(members, [5, 6, 7]);
				assert.strictEqual(clientMock.listAllGroupMembers.mock.callCount(), 1);
				assert.strictEqual(cacheMock.get.mock.callCount(), 1);
				assert.strictEqual(cacheMock.set.mock.callCount(), 1);
			});
		});
		describe('listUsersByIds', () => {
			it('should return cached entries if present', async () => {
				const cachedUser = { id: 'user-1', displayName: 'User One' };
				const cacheMock = {
					get: mock.fn(() => cachedUser)
				};
				const clientMock = {};
				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);
				const users = await cacheClient.listUsersByIds(['user-1']);
				assert.strictEqual(cacheMock.get.mock.callCount(), 1);
				assert.deepStrictEqual(users, [cachedUser]);
			});

			it('should fetch users not in cache and set', async () => {
				const fetchedUser = { id: 'user-2', displayName: 'User Two' };
				const cacheMock = {
					get: mock.fn(() => undefined),
					set: mock.fn()
				};
				const clientMock = {
					listUsersByIds: mock.fn(() => ({ users: [fetchedUser], notFoundIds: [], failedIds: [] }))
				};
				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);
				const users = await cacheClient.listUsersByIds(['user-2']);
				assert.deepStrictEqual(users, [fetchedUser]);
				assert.strictEqual(clientMock.listUsersByIds.mock.callCount(), 1);
				assert.strictEqual(cacheMock.set.mock.callCount(), 1);
			});

			it('should dedupe ids', async () => {
				// Three unique and one duplicate
				const idsWithDuplicates = ['user-1', 'user-2', 'user-3', 'user-3'];
				const fetchedUser = { id: 'some', displayName: 'data' };
				const cacheMock = {
					get: mock.fn(),
					set: mock.fn()
				};
				const clientMock = {
					listUsersByIds: mock.fn(() => ({ users: [fetchedUser], notFoundIds: [], failedIds: [] }))
				};
				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);
				await cacheClient.listUsersByIds(idsWithDuplicates);
				// Should be called three times
				assert.strictEqual(cacheMock.get.mock.callCount(), 3);
			});

			it('should handle hits and misses in the same request', async () => {
				const cachedUser = { id: 'user-1', displayName: 'User One' };
				const fetchedUser = { id: 'user-2', displayName: 'User Two' };

				const cacheMock = {
					get: mock.fn((key: string) => (key === 'entra-user__user-1' ? cachedUser : undefined)),
					set: mock.fn()
				};

				const clientMock = {
					listUsersByIds: mock.fn(() => ({ users: [fetchedUser], notFoundIds: [], failedIds: [] }))
				};

				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);
				const users = await cacheClient.listUsersByIds(['user-1', 'user-2']);

				assert.deepStrictEqual(users, [cachedUser, fetchedUser]);
				assert.strictEqual(cacheMock.get.mock.callCount(), 2);
				assert.strictEqual(clientMock.listUsersByIds.mock.callCount(), 1);
				assert.strictEqual(cacheMock.set.mock.callCount(), 1);
			});

			it('should handle empty arrays', async () => {
				const cacheMock = {
					get: mock.fn(() => undefined),
					set: mock.fn()
				};
				const clientMock = {};
				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);
				const users = await cacheClient.listUsersByIds([]);
				assert.deepStrictEqual(users, []);
			});

			it('should cache confirmed 404s and avoid refetching', async () => {
				const removedUserId = 'e3b0c442-98fc-1c14-9afb-ab1234567890';
				let fetched = false;
				const cacheMock = {
					get: mock.fn((_key: string) => {
						if (!fetched) {
							return undefined;
						}
						return null;
					}),
					set: mock.fn()
				};

				const clientMock = {
					// Graph confirmed this user doesn't exist (404)
					listUsersByIds: mock.fn(() => ({ users: [], notFoundIds: [removedUserId], failedIds: [] }))
				};

				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);

				clientMock.listUsersByIds.mock.resetCalls();
				cacheMock.get.mock.resetCalls();
				// First call - fetches from API, confirmed not found, caches as null
				const firstCall = await cacheClient.listUsersByIds([removedUserId]);
				assert.deepStrictEqual(firstCall, [{ id: removedUserId, displayName: REMOVED_USER }]);
				assert.strictEqual(clientMock.listUsersByIds.mock.callCount(), 1);
				assert.strictEqual(cacheMock.set.mock.callCount(), 1); // Caches the null

				// Reset mocks to track second call
				clientMock.listUsersByIds.mock.resetCalls();
				cacheMock.get.mock.resetCalls();
				fetched = true;
				// Second call - should return cached 404 without calling API
				const secondCall = await cacheClient.listUsersByIds([removedUserId]);
				assert.deepStrictEqual(secondCall, [{ id: removedUserId, displayName: REMOVED_USER }]);
				assert.strictEqual(clientMock.listUsersByIds.mock.callCount(), 0); // No API call
				assert.strictEqual(cacheMock.get.mock.callCount(), 1); // Only one cache check
			});

			it('should NOT cache failed lookups (401/429/5xx), falling back to Unknown user without negative-caching', async () => {
				const userId = 'e3b0c442-98fc-1c14-9afb-ab1234567891';
				const cacheMock = {
					get: mock.fn(() => undefined),
					set: mock.fn()
				};

				const clientMock = {
					// Graph returned a transient failure, not a confirmed 404
					listUsersByIds: mock.fn(() => ({ users: [], notFoundIds: [], failedIds: [userId] }))
				};

				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);
				const result = await cacheClient.listUsersByIds([userId]);

				assert.deepStrictEqual(result, [{ id: userId, displayName: UNKNOWN_USER }]);
				// Must not negative-cache a transient failure
				assert.strictEqual(cacheMock.set.mock.callCount(), 0);
			});

			it('should fall back to Unknown user for ids skipped entirely by the lower-level client (e.g. invalid UUID format)', async () => {
				const invalidId = 'not-a-uuid';
				const cacheMock = {
					get: mock.fn(() => undefined),
					set: mock.fn()
				};

				const clientMock = {
					// Lower-level client filters out invalid-format ids before even querying Graph
					listUsersByIds: mock.fn(() => ({ users: [], notFoundIds: [], failedIds: [] }))
				};

				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);
				const result = await cacheClient.listUsersByIds([invalidId]);

				assert.deepStrictEqual(result, [{ id: invalidId, displayName: UNKNOWN_USER }]);
				assert.strictEqual(cacheMock.set.mock.callCount(), 0);
			});
		});
	});
});
