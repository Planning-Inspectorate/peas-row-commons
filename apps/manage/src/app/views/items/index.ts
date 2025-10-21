import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildListItems } from './list/controller.ts';
import type { App2Service } from '#service';
import type { IRouter } from 'express';

export function createRoutes(service: App2Service): IRouter {
	const router = createRouter({ mergeParams: true });
	const listItems = buildListItems(service);

	router.get('/', asyncHandler(listItems));

	return router;
}
