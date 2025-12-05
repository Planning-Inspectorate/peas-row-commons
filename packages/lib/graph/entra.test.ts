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
