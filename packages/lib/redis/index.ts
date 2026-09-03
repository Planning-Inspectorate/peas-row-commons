import type { Logger } from 'pino';
import { RedisClient } from './redis-client.ts';

interface RedisConfig {
	redis?: string;
	redisPrefix: string;
}

export function initRedis(config: RedisConfig, logger: Logger): RedisClient | null {
	if (!config.redis) {
		return null;
	}

	return new RedisClient(config.redis, logger, config.redisPrefix);
}
