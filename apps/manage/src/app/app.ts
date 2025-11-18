import { buildRouter } from './router.ts';
import { configureNunjucks } from './nunjucks.ts';
import { addLocalsConfiguration } from '#util/config-middleware.ts';
import { createBaseApp } from '@pins/peas-row-commons-lib/app/app.ts';
import type { Express } from 'express';
import type { ManageService } from '#service';

export function createApp(service: ManageService): Express {
	const router = buildRouter(service);
	// create an express app, and configure it for our usage
	return createBaseApp({ service, configureNunjucks, router, middlewares: [addLocalsConfiguration()] });
}
