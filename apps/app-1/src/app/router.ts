import { Router as createRouter } from 'express';
import { createMonitoringRoutes } from '@pins/peas-row-commons-lib/controllers/monitoring.ts';
import { createRoutes as appRoutes } from './views/home/index.ts';
import { createErrorRoutes } from './views/static/error/index.ts';
import { cacheNoCacheMiddleware } from '@pins/peas-row-commons-lib/middleware/cache.ts';
import type { App1Service } from '#service';
import type { IRouter } from 'express';

/**
 * Main app router
 */
export function buildRouter(service: App1Service): IRouter {
	const router = createRouter();

	const monitoringRoutes = createMonitoringRoutes(service);

	router.use('/', monitoringRoutes);

	// don't cache responses, note no-cache allows some caching, but with revalidation
	// see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control#no-cache
	router.use(cacheNoCacheMiddleware);

	router.use('/', appRoutes(service));
	router.use('/error', createErrorRoutes(service));

	return router;
}
