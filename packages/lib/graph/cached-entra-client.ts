import { Client } from '@microsoft/microsoft-graph-client';
import { EntraClient } from './entra.ts';
import { MapCache } from '../util/map-cache.ts';
import { type InitEntraClient } from './types.ts';

const CACHE_PREFIX = 'entra-group__';

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
}
