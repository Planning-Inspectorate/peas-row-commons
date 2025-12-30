import { BaseService } from '@pins/peas-row-commons-lib/app/base-service.ts';
import type { Config } from './config.ts';
import { buildInitEntraClient } from '@pins/peas-row-commons-lib/graph/cached-entra-client.ts';
import { MapCache } from '@pins/peas-row-commons-lib/util/map-cache.ts';
import { type InitEntraClient } from '@pins/peas-row-commons-lib/graph/types.ts';
import { initBlobStore } from '@pins/peas-row-commons-lib/blob-store/index.ts';
import { initLogger } from '@pins/peas-row-commons-lib/util/logger.ts';
import { BlobStorageClient } from '@pins/peas-row-commons-lib/blob-store/blob-store-client.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class ManageService extends BaseService {
	/**
	 * @private
	 */
	#config: Config;

	getEntraClient: InitEntraClient;

	blobStoreClient: BlobStorageClient | null;

	constructor(config: Config) {
		super(config);
		this.#config = config;

		const logger = initLogger(config);

		const entraGroupCache = new MapCache(config.entra.cacheTtl);
		this.getEntraClient = buildInitEntraClient(!config.auth.disabled, entraGroupCache);

		this.blobStoreClient = initBlobStore(config.blobStore, logger);
	}

	get blobStore() {
		return this.blobStoreClient;
	}

	get authConfig(): Config['auth'] {
		return this.#config.auth;
	}

	get authDisabled(): boolean {
		return this.#config.auth.disabled;
	}
}
