import { DefaultAzureCredential } from '@azure/identity';
import { BlobServiceClient } from '@azure/storage-blob';
import type {
	BlockBlobClient,
	BlobUploadCommonResponse,
	BlobDownloadResponseParsed,
	BlobDeleteIfExistsResponse,
	BlockBlobUploadStreamOptions,
	BlobItem
} from '@azure/storage-blob';
import type { Logger } from 'pino';
import type { Readable } from 'node:stream';
import type { BlobMetaData } from './types.d.ts';

const commonOptions = { retryOptions: { maxTries: 3 } };

export class BlobStorageClient {
	private logger: Logger;
	private readonly host: string;
	private readonly container: string;
	private blobServiceClient: BlobServiceClient;

	constructor(logger: Logger, host: string, container: string, connectionString?: string) {
		this.logger = logger;
		this.host = host;
		this.container = container;
		if (connectionString) {
			this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
		} else {
			this.blobServiceClient = new BlobServiceClient(this.host, new DefaultAzureCredential(), commonOptions);
		}
	}

	#getBlockBlobClient(blobPath: string): BlockBlobClient {
		const containerClient = this.blobServiceClient.getContainerClient(this.container);
		return containerClient.getBlockBlobClient(blobPath);
	}

	#getFileUploadOptions(fileType: string): BlockBlobUploadStreamOptions {
		return { blobHTTPHeaders: { blobContentType: fileType } };
	}

	async upload(buffer: Buffer, mimeType: string, blobName: string): Promise<BlobUploadCommonResponse> {
		try {
			const containerClient = this.blobServiceClient.getContainerClient(this.container);
			await containerClient.createIfNotExists();
			const blockBlobClient = containerClient.getBlockBlobClient(blobName);
			return await blockBlobClient.uploadData(buffer, this.#getFileUploadOptions(mimeType));
		} catch (e) {
			this.logger.error('Error uploading file to Blob Storage');
			throw e;
		}
	}

	async uploadStream(
		fileStream: Readable,
		mimeType: string,
		blobName: string,
		bufferSize?: number,
		maxConcurrency?: number
	) {
		try {
			const containerClient = this.blobServiceClient.getContainerClient(this.container);
			await containerClient.createIfNotExists();
			const blockBlobClient = containerClient.getBlockBlobClient(blobName);
			await blockBlobClient.uploadStream(fileStream, bufferSize, maxConcurrency, this.#getFileUploadOptions(mimeType));
		} catch (e) {
			this.logger.error('Error uploading stream to Blob Storage');
			throw e;
		}
	}

	async getBlobUrl(blobName: string) {
		const blockBlobClient = this.#getBlockBlobClient(blobName);
		await this.checkBlobExists(blockBlobClient, blobName);
		return blockBlobClient.url;
	}

	async deleteBlobIfExists(blobName: string): Promise<BlobDeleteIfExistsResponse> {
		const blockBlobClient = this.#getBlockBlobClient(blobName);
		await this.checkBlobExists(blockBlobClient, blobName);
		return blockBlobClient.deleteIfExists();
	}

	async doesBlobExist(blobName: string) {
		const containerClient = this.blobServiceClient.getContainerClient(this.container);
		const blobClient = containerClient.getBlobClient(blobName);

		return await blobClient.exists();
	}

	async getContainerContents(folderName?: string): Promise<BlobMetaData[]> {
		const containerClient = this.blobServiceClient.getContainerClient(this.container);
		await containerClient.createIfNotExists();
		const options = folderName ? { prefix: folderName } : undefined;
		const blobs = await Array.fromAsync(containerClient.listBlobsFlat(options));

		return blobs.map((blob: BlobItem) => ({
			name: blob.name,
			size: blob.properties.contentLength,
			createdAt: blob.properties.createdOn,
			lastModified: blob.properties.lastModified
		}));
	}

	async checkBlobExists(blockBlobClient: BlockBlobClient, blobName: string) {
		if (!(await blockBlobClient.exists())) {
			this.logger.error(`blob ${blobName} does not exist`);
			throw new Error('blob does not exist');
		}
	}

	async downloadBlob(blobName: string): Promise<BlobDownloadResponseParsed> {
		const blockBlobClient = this.#getBlockBlobClient(blobName);
		await this.checkBlobExists(blockBlobClient, blobName);
		return await blockBlobClient.download();
	}
}
