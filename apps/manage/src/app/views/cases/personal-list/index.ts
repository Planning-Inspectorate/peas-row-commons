import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildFindSelectedUser, buildSelectUserView, buildViewPersonalList } from './controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const [personalListView, selectUserView, findSelectedUser] = createMiddlewares(service);

	router
		.route('/')
		// Gets the "assigned to me" page
		.get(personalListView);

	router
		.route('/select-user')
		// Page for picking a new user to see
		.get(selectUserView)
		// Viewing that new user once selected
		.post(findSelectedUser);

	return router;
}

/**
 * Creates the middleware functions needed for the endpoints
 */
function createMiddlewares(service: ManageService) {
	return [buildViewPersonalList(service), buildSelectUserView(service), buildFindSelectedUser(service)];
}
