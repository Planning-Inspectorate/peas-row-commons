import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { buildListItems, handleCaseTypeSelection } from './cases/controller.ts';
import { peabuildListItems, peahandleCaseTypeSelection } from './case-type/pea/controller.ts';
import type { App2Service } from '#service';
import type { IRouter } from 'express';

export function createCaseRoutes(service: App2Service): IRouter {
	const router = createRouter({ mergeParams: true });
	const caseTypes = buildListItems(service);
	const handleCasetypeSelection = handleCaseTypeSelection(service);

		const peacaseTypes = peabuildListItems(service);
	const peahandleCasetypeSelection = peahandleCaseTypeSelection(service);

	router.get('/', asyncHandler(caseTypes));

	router.post('/', asyncHandler(handleCasetypeSelection));

	router.get('/pea-page', asyncHandler(peacaseTypes));

	router.post('/pea-page', asyncHandler(peahandleCasetypeSelection));

	buildListItems
	return router;
}
