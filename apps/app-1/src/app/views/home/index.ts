import { Router as createRouter } from 'express';
import { buildHomePage } from './controller.ts';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { App1Service } from '#service';
import type { IRouter } from 'express';

export function createRoutes(service: App1Service): IRouter {
	const router = createRouter({ mergeParams: true });

	const homePageController = buildHomePage(service);
	router.get('/', asyncHandler(homePageController));

	return router;
}
