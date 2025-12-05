import { describe, it, mock } from 'node:test';
import { buildInitEntraClient, CachedEntraClient } from './cached-entra-client.ts';
import assert from 'node:assert';

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
});
