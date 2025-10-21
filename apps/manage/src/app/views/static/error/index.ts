import { Router as createRouter } from 'express';
import { firewallErrorPage } from './controller.ts';
import type { App2Service } from '#service';
import type { IRouter } from 'express';

export function createErrorRoutes(service: App2Service): IRouter {
	const router = createRouter({ mergeParams: true });

	const firewallError = firewallErrorPage(service);

	router.get('/firewall-error', firewallError);

	return router;
}
