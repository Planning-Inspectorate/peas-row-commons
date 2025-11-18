import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildListItems } from './cases/controller.ts';
import type { App2Service } from '#service';
import type { IRouter } from 'express';

export function createCaseRoutes(service: App2Service): IRouter {
	const router = createRouter({ mergeParams: true });
	const caseTypes = buildListItems(service);

	router.get('/', asyncHandler(caseTypes));

	return router;
}
