import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildListCases } from './list/controller.ts';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { getCreateCaseWorkArea, postCreateCaseWorkArea } from './create-a-case/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const listCases = buildListCases(service);

	router.get('/', asyncHandler(listCases));
	router.get('/create-a-case/questions/casework-area', getCreateCaseWorkArea(service));
	router.post('/create-a-case/questions/casework-area', postCreateCaseWorkArea(service));
	return router;
}
