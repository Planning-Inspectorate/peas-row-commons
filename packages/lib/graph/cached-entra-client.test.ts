import { describe, it, mock } from 'node:test';
import { buildInitEntraClient, CachedEntraClient } from './cached-entra-client.ts';
import assert from 'node:assert';
import { UNKNOWN_USER } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';

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
					listUsersByIds: mock.fn(() => [fetchedUser])
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
					listUsersByIds: mock.fn(() => [fetchedUser])
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
					listUsersByIds: mock.fn(() => [fetchedUser])
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
			it('should cache 404 responses and avoid refetching', async () => {
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
					listUsersByIds: mock.fn(() => []) // Returns empty, so user-999 is cached as null
				};

				const cacheClient = new CachedEntraClient(clientMock as any, cacheMock as any);

				clientMock.listUsersByIds.mock.resetCalls();
				cacheMock.get.mock.resetCalls();
				// First call - fetches from API, doesn't find user, caches as null
				const firstCall = await cacheClient.listUsersByIds(['user-999']);
				assert.deepStrictEqual(firstCall, [{ id: 'user-999', displayName: UNKNOWN_USER }]);
				assert.strictEqual(clientMock.listUsersByIds.mock.callCount(), 1);
				assert.strictEqual(cacheMock.set.mock.callCount(), 1); // Caches the null

				// Reset mocks to track second call
				clientMock.listUsersByIds.mock.resetCalls();
				cacheMock.get.mock.resetCalls();
				fetched = true;
				// Second call - should return cached 404 without calling API
				const secondCall = await cacheClient.listUsersByIds(['user-999']);
				assert.deepStrictEqual(secondCall, [{ id: 'user-999', displayName: UNKNOWN_USER }]);
				assert.strictEqual(clientMock.listUsersByIds.mock.callCount(), 0); // No API call
				assert.strictEqual(cacheMock.get.mock.callCount(), 1); // Only one cache check
			});
		});
	});
});
