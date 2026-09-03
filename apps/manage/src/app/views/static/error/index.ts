import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { firewallErrorPage } from './controller.ts';

export function createErrorRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const firewallError = firewallErrorPage(service);

	router.get('/firewall-error', firewallError);

	return router;
}
