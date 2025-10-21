import { Router as createRouter } from 'express';
import { asyncHandler } from '../util/async-handler.ts';
import { cacheNoStoreMiddleware } from '../middleware/cache.ts';
import type { BaseLogger } from 'pino';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { IRouter, Response, Request } from 'express';
import type { AsyncRequestHandler } from '../util/async-handler.ts';

interface MonitoringRoutesOptions {
	logger: BaseLogger;
	dbClient: PrismaClient;
	gitSha?: string;
}

export function createMonitoringRoutes({ gitSha, dbClient, logger }: MonitoringRoutesOptions): IRouter {
	const router = createRouter();
	const handleHealthCheck = buildHandleHeathCheck(logger, dbClient, gitSha);

	router.use(cacheNoStoreMiddleware); // don't store monitoring responses, always get fresh data

	router.head('/', asyncHandler(handleHeadHealthCheck));
	router.get('/health', asyncHandler(handleHealthCheck));

	return router;
}

export function handleHeadHealthCheck(_: Request, response: Response) {
	// no-op - HEAD mustn't return a body
	response.sendStatus(200);
}

export function buildHandleHeathCheck(
	logger: BaseLogger,
	dbClient: PrismaClient,
	gitSha?: string
): AsyncRequestHandler {
	return async (_, response) => {
		let database = false;
		try {
			await dbClient.$queryRaw`SELECT 1`;
			database = true;
		} catch (e) {
			logger.warn(e, 'database connection error');
		}

		response.status(200).send({
			status: 'OK',
			uptime: process.uptime(),
			commit: gitSha,
			database: database ? 'OK' : 'ERROR' // should this be a different response code?
		});
	};
}
