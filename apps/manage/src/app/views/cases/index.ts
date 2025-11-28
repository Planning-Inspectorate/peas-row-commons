import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildListCases } from './list/controller.ts';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { createNewCaseRoutes } from './create-a-case/index.ts';
import { createRoutes as createCaseRoutes } from './view/index.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const listCases = buildListCases(service);
	const createACaseRoutes = createNewCaseRoutes(service);
	const caseRoutes = createCaseRoutes(service);

	router.get('/', asyncHandler(listCases));
	router.use('/create-a-case', asyncHandler(createACaseRoutes));
	router.use('/:id', caseRoutes);
	return router;
}
