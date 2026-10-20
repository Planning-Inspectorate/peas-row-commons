import type { Client } from '@microsoft/microsoft-graph-client';
import { URL } from 'node:url';
import { isValidUuidFormat } from '../util/uuid.ts';
import type { UserDetails } from './cached-entra-client.ts';
import type { GroupMember } from './types.ts';
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

export interface ListUsersByIdsResult {
	users: UserDetails[];
	/** IDs the Graph API explicitly confirmed do not exist (404) - safe to treat as "removed" */
	notFoundIds: string[];
	/** IDs where the batch request failed for a reason other than 404 (401/429/5xx/etc) - must NOT be treated as removed */
	failedIds: string[];
}

export class EntraClient {
	#client;

	constructor(client: Client) {
		this.#client = client;
	}

	/**
	 * Fetch all group members - direct and indirect - of an Entra group, up to a maximum of 5000
	 */
	async listAllGroupMembers(groupId: string): Promise<GroupMember[]> {
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
	 * Batch query graph for entra ids. Distinguishes confirmed 404s (notFoundIds) from
	 * any other failure status (failedIds), so callers don't mistake a transient
	 * error for confirmation that a user has been removed.
	 */
	async listUsersByIds(ids: string[]): Promise<ListUsersByIdsResult> {
		// Batching graph query to get user details for a list of IDs.

		const uniqueIds = [...new Set(ids.filter(isValidUuidFormat))];

		if (uniqueIds.length === 0) {
			return { users: [], notFoundIds: [], failedIds: [] };
		}

		// Cannot batch more than 20 (MAX_BATCH_SIZE): https://learn.microsoft.com/en-gb/graph/json-batching
		const chunks: string[][] = [];
		for (let i = 0; i < uniqueIds.length; i += MAX_BATCH_SIZE) {
			chunks.push(uniqueIds.slice(i, i + MAX_BATCH_SIZE));
		}

		const users: UserDetails[] = [];
		const notFoundIds: string[] = [];
		const failedIds: string[] = [];

		for (const chunk of chunks) {
			const requests = chunk.map((userId, index) => ({
				id: String(index + 1),
				method: 'GET',
				url: `/users/${encodeURIComponent(userId)}?$select=id,displayName`
			}));

			// map batch response "id" (1-based index) back to the requested userId,
			// so a failure can be attributed to the right ID even without item.body
			const idByRequestId = new Map(requests.map((req, index) => [req.id, chunk[index]]));

			const response = await this.#client.api('/$batch').post({ requests });
			for (const item of response.responses ?? []) {
				const requestedId = idByRequestId.get(item.id);
				if (item.status === 200 && item.body?.id && requestedId) {
					// Users fetched are not part of the Entra groups (otherwise they would have been fetched in listAllGroupMembers),
					// so we can assume they are inactive users. Appending (Inactive) to their display name to indicate this in the UI.
					const inactiveUserDisplayName = `${item.body.displayName || item.body.id} (Inactive)`;
					users.push({ id: requestedId, displayName: inactiveUserDisplayName });
				} else if (item.status === 404 && requestedId) {
					// Confirmed by Graph: this user does not exist - safe to treat as "removed"
					notFoundIds.push(requestedId);
				} else if (requestedId) {
					// Any other non-200 status (401, 429, 5xx, etc) is a failure, not confirmation
					// of absence - must not be negative-cached or reported as "removed"
					failedIds.push(requestedId);
				}
			}
		}
		return { users, notFoundIds, failedIds };
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
