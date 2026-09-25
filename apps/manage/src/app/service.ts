import { initDatabaseClient } from '@pins/peas-row-commons-database';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { BlobStorageClient } from '@pins/peas-row-commons-lib/blob-store/blob-store-client.ts';
import { initBlobStore } from '@pins/peas-row-commons-lib/blob-store/index.ts';
import type { EntraClientCacheEntry } from '@pins/peas-row-commons-lib/graph/cached-entra-client.ts';
import { buildInitEntraClient } from '@pins/peas-row-commons-lib/graph/cached-entra-client.ts';
import { type InitEntraClient } from '@pins/peas-row-commons-lib/graph/types.ts';
import { BaseService } from '@planning-inspectorate/core/app';
import { MapCache } from '@planning-inspectorate/core/util';
import type { Archiver, ArchiverOptions } from 'archiver';
import { ZipArchive } from 'archiver';
import { buildAuditService, type AuditService } from './audit/index.ts';
import type { Config } from './config.ts';

export type ZipArchiveFactory = (options?: ArchiverOptions) => Archiver;

/**
 * This class encapsulates all the services and clients for the application
 */
export class ManageService extends BaseService<PrismaClient> {
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
		super(config, initDatabaseClient);
		this.#config = config;

		const entraGroupCache = new MapCache<EntraClientCacheEntry>(config.entra.cacheTtl);
		this.getEntraClient = buildInitEntraClient(!config.auth.disabled, entraGroupCache);

		this.blobStoreClient = initBlobStore(config.blobStore, this.logger);

		this.audit = buildAuditService(this.db, this.logger);

		this.createZipArchive = (options) => new ZipArchive(options);
	}

	get authConfig(): Config['auth'] {
		return this.#config.auth;
	}

	get authDisabled(): boolean {
		return this.#config.auth.disabled;
	}

	get blobStore() {
		return this.blobStoreClient;
	}

	get changeAuthorityEmail() {
		return this.#config.contactEmails.authorityChangeRequestEmail;
	}

	get chromiumPath(): string {
		return this.#config.chromiumPath;
	}

	get entraGroupIds() {
		return this.#config.entra.groupIds;
	}
}
