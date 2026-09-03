import type { IPartitionManager } from '@azure/msal-node';
import { DistributedCachePlugin } from '@azure/msal-node';
import { RedisStore } from 'connect-redis';
import type { Logger } from 'pino';
import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import { MSALCacheClient } from './msal-cache-client.ts';
import { PartitionManager } from './partition-manager.ts';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export class RedisClient {
	private readonly prefix: string;
	private readonly logger: Logger;
	private readonly client: RedisClientType;
	readonly store: RedisStore;
	readonly get: (key: string) => Promise<null | string>;
	readonly set: (key: string, value: string) => void;
	private readonly clientWrapper: MSALCacheClient;

	/**
     @param connString - Redis connection string
     @param logger
     @param prefix - prefix to use for shared instances
   **/
	constructor(connString: string, logger: Logger, prefix?: string) {
		this.prefix = prefix + 'sess:';
		this.logger = logger;

		const redisParams = parseRedisConnectionString(connString);

		const socket = redisParams.ssl
			? { host: redisParams.host, port: redisParams.port, tls: true as const }
			: { host: redisParams.host, port: redisParams.port };

		this.client = createClient({
			socket,
			password: redisParams.password,
			// send a ping every 5 minutes to prevent idle timeout (10mins in Azure)
			// https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices-connection#idle-timeout
			pingInterval: FIVE_MINUTES_MS
		});

		const onError = (err: Error) => logger.error(`Could not establish a connection with redis server: ${err}`);

		this.client.on('connect', () => logger.info('Initiating connection to redis server...'));
		this.client.on('ready', () => logger.info('Connected to redis server successfully...'));
		this.client.on('end', () => logger.info('Disconnected from redis server...'));
		this.client.on('error', onError);
		this.client.on('reconnecting', () => logger.info('Reconnecting to redis server...'));

		// kick off the connection - no await here, in the background
		this.client.connect().catch(onError);

		// dev note: this may 'error' in vscode, but tscheck is all OK
		this.store = new RedisStore({
			client: this.client,
			prefix: this.prefix
		});

		this.get = this.client.get;
		this.set = this.client.set;

		this.clientWrapper = new MSALCacheClient(this.client);
	}

	makeCachePlugin(sessionId: string): DistributedCachePlugin {
		const partitionManager = new PartitionManager(this.clientWrapper, sessionId, this.logger, this.prefix);
		return new DistributedCachePlugin(this.clientWrapper, partitionManager as IPartitionManager);
	}
}

export interface RedisConnectionDetails {
	host: string;
	port: number;
	password: string;
	ssl: boolean;
	abortConnect: boolean;
}

/**
 * @param {string} str - in the form 'some.example.org:6380,password=some_password,ssl=True,abortConnect=False'
 * @returns {RedisConnectionDetails}
 */
export function parseRedisConnectionString(str: string): RedisConnectionDetails {
	if (typeof str !== 'string') {
		throw new Error('not a string');
	}
	const parts = str.split(',');
	if (parts.length !== 4) {
		throw new Error('unexpected redis connection string format, expected 4 parts');
	}
	const [hostPort, passwordPart, sslPart, abortConnectPart] = parts;
	const hostParts = hostPort.split(':');
	if (hostParts.length !== 2) {
		throw new Error('unexpected host:port format for redis string, expected 2 parts');
	}
	const port = parseInt(hostParts[1]);
	if (isNaN(port)) {
		throw new Error('unexpected port for redis string, expected int');
	}
	if (!passwordPart.startsWith('password=')) {
		throw new Error('unexpected password for redis string, expected password=');
	}
	const password = passwordPart.substring('password='.length);
	const ssl = sslPart.toLowerCase().endsWith('true');
	const abortConnect = abortConnectPart.toLowerCase().endsWith('true');

	return {
		host: hostParts[0],
		port,
		password,
		ssl,
		abortConnect
	};
}
