import { Client } from '@microsoft/microsoft-graph-client';
import { REMOVED_USER, UNKNOWN_USER } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import type { MapCache } from '@planning-inspectorate/core/util';
import { isValidUuidFormat } from '../util/uuid.ts';
import { EntraClient } from './entra.ts';
import type { GroupMember, InitEntraClient } from './types.ts';

export interface UserDetails {
	id: string;
	displayName: string;
}

const CACHE_PREFIX = 'entra-group__';
const USER_CACHE_PREFIX = 'entra-user__';

export type EntraClientCacheEntry = GroupMember[] | UserDetails | null;
export type EntraClientMapCache = MapCache<EntraClientCacheEntry>;

export function buildInitEntraClient(authEnabled: boolean, cache: EntraClientMapCache): InitEntraClient {
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
	#cache: EntraClientMapCache;

	constructor(client: EntraClient, cache: EntraClientMapCache) {
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
				users.push({ id, displayName: isValidUuidFormat(id) ? REMOVED_USER : UNKNOWN_USER });
			} else {
				// Found in cache
				users.push(cached as UserDetails);
			}
		}

		if (misses.length) {
			const { users: fetched, notFoundIds, failedIds } = await this.#client.listUsersByIds(misses);

			for (const user of fetched) {
				this.#cache.set(USER_CACHE_PREFIX + user.id, user);
				users.push(user);
			}

			for (const id of notFoundIds) {
				// Graph confirmed this user doesn't exist - safe to negative-cache
				this.#cache.set(USER_CACHE_PREFIX + id, null);
				users.push({ id, displayName: isValidUuidFormat(id) ? REMOVED_USER : UNKNOWN_USER });
			}

			for (const id of failedIds) {
				// Transient/auth/rate-limit failure - do NOT cache (so it's retried later),
				// and don't claim the user was "removed" based on an inconclusive result
				users.push({ id, displayName: UNKNOWN_USER });
			}

			// IDs skipped entirely before even reaching Graph (e.g. invalid UUID format)
			const handledIds = new Set([...fetched.map((u) => u.id), ...notFoundIds, ...failedIds]);
			for (const id of misses) {
				if (!handledIds.has(id)) {
					users.push({ id, displayName: UNKNOWN_USER });
				}
			}
		}
		return users;
	}
}
