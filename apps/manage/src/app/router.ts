import { Router as createRouter } from 'express';
import { createRoutesAndGuards as createAuthRoutesAndGuards } from './auth/router.ts';
import { createMonitoringRoutes } from '@pins/peas-row-commons-lib/controllers/monitoring.ts';
import { createRoutes as createItemRoutes } from './views/items/index.ts';
import { createErrorRoutes } from './views/static/error/index.ts';
import { cacheNoCacheMiddleware } from '@pins/peas-row-commons-lib/middleware/cache.ts';
import type { App2Service } from '#service';
import type { IRouter } from 'express';
import { createCaseRoutes } from './views/case-types/index.ts';

/**
 * Main app router
 */
export function buildRouter(service: App2Service): IRouter {
	const router = createRouter();
	const monitoringRoutes = createMonitoringRoutes(service);
	const { router: authRoutes, guards: authGuards } = createAuthRoutesAndGuards(service);
	const itemsRoutes = createItemRoutes(service);
	const caseRoutes = createCaseRoutes(service);

	router.use('/', monitoringRoutes);

	// don't cache responses, note no-cache allows some caching, but with revalidation
	// see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control#no-cache
	router.use(cacheNoCacheMiddleware);

	router.get('/unauthenticated', (req, res) => res.status(401).render('views/errors/401.njk'));

	if (!service.authDisabled) {
		service.logger.info('registering auth routes');
		router.use('/auth', authRoutes);

		// all subsequent routes require auth

		// check logged in
		router.use(authGuards.assertIsAuthenticated);
		// check group membership
		router.use(authGuards.assertGroupAccess);
	} else {
		service.logger.warn('auth disabled; auth routes and guards skipped');
	}

	router.get('/', (req, res) => res.redirect('/items'));
	router.use('/items', itemsRoutes);
	router.use('/create-case', caseRoutes);
	router.use('/error', createErrorRoutes(service));

// 	router.get('/pea-page', (req, res) => {
//     res.render('views/case-types/case-type/view.njk', {
//         pageTitle: 'Planning, Environment and Applications'
//     });
// });

// router.get('/rwc-page', (req, res) => {
//     res.render('views/rwc-page/view.njk', {
//         pageTitle: 'Right of Way Cases'
//     });
// });

	return router;
}
