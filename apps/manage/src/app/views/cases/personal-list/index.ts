import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildViewPersonalList } from './controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const personalListView = buildViewPersonalList(service);

	router
		.route('/')
		// Gets the "assigned to me" page
		.get(personalListView);

	return router;
}
