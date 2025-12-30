export interface BlobStoreConfig {
	disabled: boolean;
	host: string;
	container: string;
	connectionString: string;
}

export interface BlobMetaData {
	name: string;
	size: number | undefined;
	createdAt: Date | undefined;
	lastModified: Date;
}
