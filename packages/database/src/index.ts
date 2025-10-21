import { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { PrismaMssql } from '@prisma/adapter-mssql';
import type { Prisma } from '@pins/peas-row-commons-database/src/client/client.d.ts';
import type { Logger } from 'pino';
import type { DatabaseConfig } from '@pins/peas-row-commons-lib/app/config-types.js';

export function initDatabaseClient(
	config: { database: DatabaseConfig; NODE_ENV: string },
	logger: Logger
): PrismaClient {
	let prismaLogger: Logger | undefined;

	if (config.NODE_ENV !== 'production') {
		prismaLogger = logger;
	}

	if (!config.database.connectionString) {
		throw new Error('database connectionString is required');
	}

	return newDatabaseClient(config.database.connectionString, prismaLogger);
}

export function newDatabaseClient(connectionString: string, logger?: Logger): PrismaClient {
	const adapter = new PrismaMssql(connectionString);
	const prisma = new PrismaClient({
		adapter,
		log: [
			{
				emit: 'event',
				level: 'query'
			},
			{
				emit: 'event',
				level: 'error'
			},
			{
				emit: 'event',
				level: 'info'
			},
			{
				emit: 'event',
				level: 'warn'
			}
		]
	});

	if (logger) {
		const logQuery = (e: Prisma.QueryEvent) => {
			logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma query');
		};

		const logError = (e: Prisma.LogEvent) => logger.error({ e }, 'Prisma error');
		const logInfo = (e: Prisma.LogEvent) => logger.debug({ e });
		const logWarn = (e: Prisma.LogEvent) => logger.warn({ e });

		prisma.$on('query', logQuery);
		prisma.$on('error', logError);
		prisma.$on('info', logInfo);
		prisma.$on('warn', logWarn);
	}

	return prisma;
}
