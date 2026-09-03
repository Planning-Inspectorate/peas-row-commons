import { BaseService } from '@pins/peas-row-commons-lib/app/base-service.ts';
import type { BlobStorageClient } from '@pins/peas-row-commons-lib/blob-store/blob-store-client.ts';
import { initBlobStore } from '@pins/peas-row-commons-lib/blob-store/index.ts';
import { buildInitEntraClient } from '@pins/peas-row-commons-lib/graph/cached-entra-client.ts';
import { type InitEntraClient } from '@pins/peas-row-commons-lib/graph/types.ts';
import { initLogger } from '@pins/peas-row-commons-lib/util/logger.ts';
import { MapCache } from '@pins/peas-row-commons-lib/util/map-cache.ts';
import type { Archiver, ArchiverOptions } from 'archiver';
import { ZipArchive } from 'archiver';
import { buildAuditService, type AuditService } from './audit/index.ts';
import type { Config } from './config.ts';

export type ZipArchiveFactory = (options?: ArchiverOptions) => Archiver;

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

	audit: AuditService;

	/**
	 * Used for zipping files in bulk download
	 */
	createZipArchive: ZipArchiveFactory;

	constructor(config: Config) {
		super(config);
		this.#config = config;

		const logger = initLogger(config);

		const entraGroupCache = new MapCache(config.entra.cacheTtl);
		this.getEntraClient = buildInitEntraClient(!config.auth.disabled, entraGroupCache);

		this.blobStoreClient = initBlobStore(config.blobStore, logger);

		this.audit = buildAuditService(this.db, logger);

		this.createZipArchive = (options) => new ZipArchive(options);
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

	get chromiumPath(): string {
		return this.#config.chromiumPath;
	}
}
