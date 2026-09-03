import type { AccountEntity } from '@azure/msal-common';
import type { ICacheClient } from '@azure/msal-node';
import type { BaseLogger } from 'pino';

export class PartitionManager {
	private readonly redisClient: ICacheClient;
	private readonly sessionId: string;
	private readonly logger: BaseLogger;
	private readonly keyPrefix: string;

	constructor(redisClient: ICacheClient, sessionId: string, logger: BaseLogger, keyPrefix: string = 'sess:') {
		this.redisClient = redisClient;
		this.sessionId = sessionId;
		this.logger = logger;
		this.keyPrefix = keyPrefix;
	}

	/**
	 * @returns {Promise<string>}
	 * */
	async getKey(): Promise<string> {
		try {
			const sessionData = await this.redisClient.get(`${this.keyPrefix}${this.sessionId}`);
			const session = JSON.parse(sessionData);
			return session.account?.homeAccountId || '';
		} catch (err: any) {
			this.logger.error(err.msg);
			return '';
		}
	}

	async extractKey(accountEntity: AccountEntity): Promise<string> {
		if (!accountEntity.homeAccountId) {
			throw new Error('homeAccountId not found');
		}

		return accountEntity.homeAccountId;
	}
}
