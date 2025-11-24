import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildListCases } from './list/controller.ts';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { createCaseTypeRoutes } from './create-a-case/index.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const listCases = buildListCases(service);
	const createACaseRoutes = createCaseTypeRoutes(service);

	router.get('/', asyncHandler(listCases));
	router.use('/create-a-case', asyncHandler(createACaseRoutes));
	return router;
}
