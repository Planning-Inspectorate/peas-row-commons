import type { ManageService } from '#service';
import { asyncHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { createNewCaseRoutes } from './create-a-case/index.ts';
import { buildListCases } from './list/controller.ts';
import { createRoutes as createPersonalListRoutes } from './personal-list/index.ts';
import { createRoutes as createCaseRoutes } from './view/index.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const listCases = buildListCases(service);
	const createACaseRoutes = createNewCaseRoutes(service);
	const caseRoutes = createCaseRoutes(service);
	const personalListRoutes = createPersonalListRoutes(service);

	// Main list page / landing page
	router.get('/', asyncHandler(listCases));

	// Page / flow for creating a new case
	router.use('/create-a-case', asyncHandler(createACaseRoutes));

	// Cases that a user is assigned to either as case officer or inspector
	router.use('/personal-list', personalListRoutes);

	// Specific case view
	router.use('/:id', caseRoutes);
	return router;
}
