import { BaseService } from '@pins/peas-row-commons-lib/app/base-service.ts';
import type { Config } from './config.ts';
import { buildInitEntraClient } from '@pins/peas-row-commons-lib/graph/cached-entra-client.ts';
import { MapCache } from '@pins/peas-row-commons-lib/util/map-cache.ts';
import { type InitEntraClient } from '@pins/peas-row-commons-lib/graph/types.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class ManageService extends BaseService {
	/**
	 * @private
	 */
	#config: Config;

	getEntraClient: InitEntraClient;

	constructor(config: Config) {
		super(config);
		this.#config = config;

		const entraGroupCache = new MapCache(config.entra.cacheTtl);
		this.getEntraClient = buildInitEntraClient(!config.auth.disabled, entraGroupCache);
	}

	get authConfig(): Config['auth'] {
		return this.#config.auth;
	}

	get authDisabled(): boolean {
		return this.#config.auth.disabled;
	}
}
