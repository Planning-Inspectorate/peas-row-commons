import { Client } from '@microsoft/microsoft-graph-client';
import { EntraClient } from './entra.ts';
import { MapCache } from '../util/map-cache.ts';
import { type InitEntraClient } from './types.ts';
import { UNKNOWN_USER } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';

export interface UserDetails {
	id: string;
	displayName: string;
}

const CACHE_PREFIX = 'entra-group__';
const USER_CACHE_PREFIX = 'entra-user__';

export function buildInitEntraClient(authEnabled: boolean, cache: MapCache): InitEntraClient {
	return (session) => {
		if (!authEnabled) {
			return null;
		}
		const accessToken = session.account?.accessToken;

		const client = Client.initWithMiddleware({
			authProvider: {
				async getAccessToken() {
					if (!accessToken) {
						throw new Error('Failed to get access token');
					}
					return accessToken;
				}
			}
		});

		const entraClient = new EntraClient(client);
		return new CachedEntraClient(entraClient, cache);
	};
}

/**
 * Wraps the EntraClient with a cache
 */
export class CachedEntraClient {
	#client: EntraClient;
	#cache: MapCache;

	constructor(client: EntraClient, cache: MapCache) {
		this.#client = client;
		this.#cache = cache;
	}

	/**
	 * Fetch all group members - direct and indirect - of an Entra group, up to a maximum of 5000
	 */
	async listAllGroupMembers(groupId: string) {
		const key = CACHE_PREFIX + groupId;
		let members = this.#cache.get(key);
		if (members) {
			return members;
		}
		members = await this.#client.listAllGroupMembers(groupId);
		this.#cache.set(key, members);
		return members;
	}

	/**
	 * Batch query graph for entra ids, with cache for user details
	 */
	async listUsersByIds(userIds: string[]): Promise<UserDetails[]> {
		const uniqueIds = [...new Set(userIds)];
		const users: UserDetails[] = [];
		const misses: string[] = [];

		for (const id of uniqueIds) {
			const key = USER_CACHE_PREFIX + id;
			const cached = this.#cache.get(key);
			if (cached === undefined) {
				// Not in cache or expired - need to fetch
				misses.push(id);
			} else if (cached === null) {
				// Cached 404 - return placeholder
				users.push({ id, displayName: UNKNOWN_USER });
			} else {
				// Found in cache
				users.push(cached);
			}
		}

		if (misses.length) {
			const fetched = await this.#client.listUsersByIds(misses);
			const foundIds = new Set(fetched.map((user) => user.id));
			for (const user of fetched) {
				this.#cache.set(USER_CACHE_PREFIX + user.id, user);
				users.push(user);
			}
			for (const id of misses) {
				// Add missing IDs to cache as null to avoid repeated fetches for non-existent users
				// but only if they weren't found in the successful fetch
				if (!foundIds.has(id)) {
					this.#cache.set(USER_CACHE_PREFIX + id, null);
					users.push({ id, displayName: UNKNOWN_USER });
				}
			}
		}
		return users;
	}
}
