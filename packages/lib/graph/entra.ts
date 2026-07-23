import { URL } from 'node:url';
import { Client } from '@microsoft/microsoft-graph-client';
import { isValidUuidFormat } from '../util/uuid.ts';
import type { UserDetails } from './cached-entra-client.ts';
const PER_PAGE = 500; // max 999 per page
const MAX_PAGES = 10; // max 5000 entries
const MAX_BATCH_SIZE = 20; // max 20 requests per batch as per Microsoft Graph API limits

// odata reference properties and values
export const ODATA = Object.freeze({
	NEXT_LINK: '@odata.nextLink',
	TYPE: '@odata.type',
	GROUP_TYPE: '#microsoft.graph.group',
	USER_TYPE: '#microsoft.graph.user'
});

export class EntraClient {
	#client;

	constructor(client: Client) {
		this.#client = client;
	}

	/**
	 * Fetch all group members - direct and indirect - of an Entra group, up to a maximum of 5000
	 */
	async listAllGroupMembers(groupId: string) {
		const listMembers = this.#client
			.api(`groups/${groupId}/transitiveMembers`)
			.select(['id', 'displayName'])
			.top(PER_PAGE);

		const members = [];
		for (let i = 0; i < MAX_PAGES; i++) {
			const res = await listMembers.get();
			members.push(...res.value.filter((v: Record<string, any>) => v[ODATA.TYPE] === ODATA.USER_TYPE));

			const nextLink = res[ODATA.NEXT_LINK];
			if (!nextLink) {
				break;
			}
			// make the next request with the skipToken value to fetch the next page
			const token = EntraClient.extractSkipToken(nextLink) || '';
			listMembers.skipToken(token);
		}
		return members;
	}

	/**
	 * Batch query graph for entra ids
	 */
	async listUsersByIds(ids: string[]): Promise<UserDetails[]> {
		// Batching graph query to get user details for a list of IDs.

		const uniqueIds = [...new Set(ids.filter(isValidUuidFormat))];

		if (uniqueIds.length === 0) return [];

		// Cannot batch more than 20 (MAX_BATCH_SIZE): https://learn.microsoft.com/en-gb/graph/json-batching
		const chunks: string[][] = [];
		for (let i = 0; i < uniqueIds.length; i += MAX_BATCH_SIZE) {
			chunks.push(uniqueIds.slice(i, i + MAX_BATCH_SIZE));
		}

		const users: Array<{ id: string; displayName: string }> = [];

		for (const chunk of chunks) {
			const requests = chunk.map((userId, index) => ({
				id: String(index + 1),
				method: 'GET',
				url: `/users/${encodeURIComponent(userId)}?$select=id,displayName`
			}));

			const response = await this.#client.api('/$batch').post({ requests });
			for (const item of response.responses ?? []) {
				if (item.status === 200 && item.body?.id) {
					// Users fetched are not part of the Entra groups (otherwise they would have been fetched in listAllGroupMembers),
					// so we can assume they are inactive users. Appending (Inactive) to their display name to indicate this in the UI.
					const inactiveUserDisplayName = `${item.body.displayName || item.body.id} (Inactive)`;
					users.push({ id: item.body.id, displayName: inactiveUserDisplayName });
				}
			}
		}
		return users;
	}

	/**
	 * Get a skip token out of an '@odata.nextLink' value
	 */
	static extractSkipToken(link: string) {
		const url = URL.parse(link);
		if (!url) {
			return undefined;
		}
		for (const [k, v] of url.searchParams) {
			if (k.toLowerCase() === '$skiptoken') {
				return v;
			}
		}
	}
}
