import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { EntraClient, ODATA } from './entra.ts';

describe('EntraClient', () => {
	describe('listAllGroupMembers', () => {
		const mockClient = () => {
			return {
				api() {
					return this;
				},
				select() {
					return this;
				},
				top() {
					return this;
				},
				skipToken: mock.fn(() => this),
				get: mock.fn(() => ({ value: [] }))
			};
		};

		it('should call get and return members', async () => {
			const client = mockClient();
			client.get.mock.mockImplementation((() => {
				return {
					value: [{ id: '1', displayName: 'Name', [ODATA.TYPE]: ODATA.USER_TYPE }]
				};
			}) as any);
			const entra = new EntraClient(client as any);
			const members = await entra.listAllGroupMembers('group-1');
			assert.strictEqual(client.get.mock.callCount(), 1);
			assert.strictEqual(members.length, 1);
		});

		it('should return only users not groups', async () => {
			const client = mockClient();
			client.get.mock.mockImplementation((() => {
				return {
					value: [
						{ id: '1', displayName: 'Name 1', [ODATA.TYPE]: ODATA.USER_TYPE },
						{ id: '2', displayName: 'Name 2', [ODATA.TYPE]: ODATA.GROUP_TYPE },
						{ id: '3', displayName: 'Name 3', [ODATA.TYPE]: ODATA.GROUP_TYPE }
					]
				};
			}) as any);
			const entra = new EntraClient(client as any);
			const members = await entra.listAllGroupMembers('group-1');
			assert.strictEqual(client.get.mock.callCount(), 1);
			assert.strictEqual(members.length, 1);
		});

		it('should call get until all members are fetched', async () => {
			const client = mockClient();
			const membersList = Array.from({ length: 20 }, (v, i) => {
				return { id: i, displayName: `Name ${i + 1}`, [ODATA.TYPE]: ODATA.USER_TYPE };
			});
			let index = 0;
			const perPage = 2;

			client.get.mock.mockImplementation((() => {
				const end = (index + 1) * perPage >= membersList.length;
				const value = membersList.slice(index, index + perPage);
				index++;
				return {
					[ODATA.NEXT_LINK]: end ? undefined : `https://example.com?$skipToken=token-${index}`,
					[ODATA.TYPE]: ODATA.USER_TYPE,
					value
				};
			}) as any);
			const entra = new EntraClient(client as any);
			const members = await entra.listAllGroupMembers('group-1');
			assert.strictEqual(client.get.mock.callCount(), 10);
			assert.strictEqual(client.skipToken.mock.callCount(), 9);
			assert.strictEqual(members.length, 20);
		});

		it('should call get a maximum of 10 times', async () => {
			const client = mockClient();
			client.get.mock.mockImplementation((() => {
				return {
					[ODATA.NEXT_LINK]: 'https://example.com?$skipToken=token-1',
					value: [{ id: '1', displayName: 'Name', [ODATA.TYPE]: ODATA.USER_TYPE }]
				};
			}) as any);
			const entra = new EntraClient(client as any);
			await entra.listAllGroupMembers('group-1');
			assert.strictEqual(client.get.mock.callCount(), 10);
		});
	});
	describe('listUsersByIds', () => {
		const mockClient = () => {
			return {
				api() {
					return this;
				},
				post: mock.fn(() => {})
			};
		};

		it('should get user details from ids', async () => {
			const client = mockClient();
			client.post.mock.mockImplementation((() => {
				return {
					responses: [
						{
							id: '1',
							status: 200,
							body: {
								id: '9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
								displayName: 'Simon Says'
							}
						},
						{
							id: '2',
							status: 200,
							body: {
								id: '3c8a1f92-6e47-4d3b-b2f8-1a9e5c7d6041',
								displayName: 'Simon Declares'
							}
						}
					]
				};
			}) as any);
			const entra = new EntraClient(client as any);
			const users = await entra.listUsersByIds([
				'9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
				'3c8a1f92-6e47-4d3b-b2f8-1a9e5c7d6041'
			]);
			assert.strictEqual(client.post.mock.callCount(), 1);
			assert.strictEqual(users.length, 2);
			assert.deepStrictEqual(users[0], {
				id: '9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
				displayName: 'Simon Says (Inactive)'
			});
			assert.deepStrictEqual(users[1], {
				id: '3c8a1f92-6e47-4d3b-b2f8-1a9e5c7d6041',
				displayName: 'Simon Declares (Inactive)'
			});
		});

		it('should handle more than 20 unique ids', async () => {
			const client = mockClient();
			// Generate 21 valid UUIDs
			const ids = Array.from(
				{ length: 21 },
				(_, index) => `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`
			);
			const batchBodies: Array<{ requests: Array<{ id: string; url: string }> }> = [];

			client.post.mock.mockImplementation(((body: { requests: Array<{ id: string; url: string }> }) => {
				batchBodies.push(body);
				return {
					responses: body.requests.map((request) => {
						const id = decodeURIComponent(request.url.split('/').pop()?.split('?')[0] as string);
						return {
							id: request.id,
							status: 200,
							body: {
								id: decodeURIComponent(id),
								displayName: `User ${id}`
							}
						};
					})
				};
			}) as any);

			const entra = new EntraClient(client as any);
			const users = await entra.listUsersByIds(ids);

			assert.strictEqual(client.post.mock.callCount(), 2);
			assert.strictEqual(batchBodies.length, 2);
			assert.strictEqual(batchBodies[0].requests.length, 20);
			assert.strictEqual(batchBodies[1].requests.length, 1);
			assert.strictEqual(users.length, 21);
			assert.deepStrictEqual(
				users[0],
				{
					id: '00000000-0000-0000-0000-000000000000',
					displayName: 'User 00000000-0000-0000-0000-000000000000 (Inactive)'
				},
				'user 1 is wrong'
			);
			assert.deepStrictEqual(users[20], {
				id: '00000000-0000-0000-0000-000000000020',
				displayName: 'User 00000000-0000-0000-0000-000000000020 (Inactive)'
			});
		});

		it('should handle missing displayNames', async () => {
			const client = mockClient();
			client.post.mock.mockImplementation((() => {
				return {
					responses: [
						{
							id: '1',
							status: 200,
							body: {
								id: '9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
								displayName: 'Simon Says'
							}
						},
						{
							id: '2',
							status: 200,
							body: {
								id: '3c8a1f92-6e47-4d3b-b2f8-1a9e5c7d6041',
								displayName: null
							}
						}
					]
				};
			}) as any);
			const entra = new EntraClient(client as any);
			const users = await entra.listUsersByIds([
				'9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
				'3c8a1f92-6e47-4d3b-b2f8-1a9e5c7d6041'
			]);
			assert.strictEqual(client.post.mock.callCount(), 1);
			assert.strictEqual(users.length, 2);
			assert.deepStrictEqual(users[0], {
				id: '9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
				displayName: 'Simon Says (Inactive)'
			});
			assert.deepStrictEqual(users[1], {
				id: '3c8a1f92-6e47-4d3b-b2f8-1a9e5c7d6041',
				displayName: '3c8a1f92-6e47-4d3b-b2f8-1a9e5c7d6041 (Inactive)'
			});
		});

		it('should return only users from successful (200) batch responses', async () => {
			const client = mockClient();
			client.post.mock.mockImplementation((() => {
				return {
					responses: [
						{
							id: '1',
							status: 200,
							body: {
								id: '9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
								displayName: 'Simon Says'
							}
						},
						{
							id: '2',
							status: 404,
							body: {
								error: {
									code: 'Request_ResourceNotFound',
									message:
										"Resource '3c8a1f92-6e47-4d3b-b2f8-1a9e5c7d6041' does not exist or one of its queried reference-property objects are not present.",
									innerError: {
										date: '2026-05-01T18:43:39',
										'request-id': 'b7e2c4a9-1d6f-4b83-9c2e-8f15a6d37b90',
										'client-request-id': 'b7e2c4a9-1d6f-4b83-9c2e-8f15a6d37b90'
									}
								}
							}
						}
					]
				};
			}) as any);
			const entra = new EntraClient(client as any);
			const users = await entra.listUsersByIds([
				'9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
				'3c8a1f92-6e47-4d3b-b2f8-1a9e5c7d6041'
			]);
			assert.strictEqual(client.post.mock.callCount(), 1);
			assert.strictEqual(users.length, 1);
			assert.deepStrictEqual(users[0], {
				id: '9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
				displayName: 'Simon Says (Inactive)'
			});
		});

		it('should return only users with a valid uuid', async () => {
			const client = mockClient();
			client.post.mock.mockImplementation((() => {
				return {
					responses: [
						{
							id: '1',
							status: 200,
							body: {
								id: '9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0',
								displayName: 'Simon Says'
							}
						}
					]
				};
			}) as any);
			const entra = new EntraClient(client as any);
			await entra.listUsersByIds(['9f3b7d4e-2c61-4a85-8d1f-5b7c9e2a14f0', 'not-a-uuid']);
			assert.strictEqual(client.post.mock.callCount(), 1);
			const args = (
				client.post.mock.calls[0] as unknown as { arguments: [{ requests: Array<Record<string, string>> }] }
			).arguments[0];
			assert.strictEqual(
				args.requests.length,
				1,
				'Expected batch payload to include only one request for the single valid UUID'
			);
		});

		it('should return an empty array if no valid uuid is provided', async () => {
			const client = mockClient();
			const entra = new EntraClient(client as any);
			const users = await entra.listUsersByIds(['not-a-uuid', 'also-not-a-uuid']);
			assert.strictEqual(client.post.mock.callCount(), 0);
			assert.strictEqual(users.length, 0);
		});
	});
	describe('extractSkipToken', () => {
		const tests = [
			{
				name: 'empty',
				link: '',
				token: undefined
			},
			{
				name: 'no params',
				link: 'https://example.com',
				token: undefined
			},
			{
				name: 'lowercase',
				link: 'https://example.com/?$skiptoken=some-token-here',
				token: 'some-token-here'
			},
			{
				name: 'title case',
				link: 'https://example.com/?$skipToken=some-token-here',
				token: 'some-token-here'
			}
		];

		for (const test of tests) {
			it(`should handle ${test.name}`, () => {
				const token = EntraClient.extractSkipToken(test.link);
				assert.strictEqual(token, test.token);
			});
		}
	});
});
