import type { ManageService } from '#service';
import { addLocalsConfiguration } from '#util/config-middleware.ts';
import { createBaseApp } from '@pins/peas-row-commons-lib/app/app.ts';
import { loadManifest } from '@pins/peas-row-commons-lib/util/manifest.ts';
import type { Express } from 'express';
import { configureNunjucks } from './nunjucks.ts';
import { buildRouter } from './router.ts';

export async function createApp(service: ManageService): Promise<Express> {
	const router = buildRouter(service);
	const manifest = await loadManifest(service.staticDir, service.logger);
	// create an express app, and configure it for our usage
	return createBaseApp({ service, configureNunjucks, router, middlewares: [addLocalsConfiguration(manifest)] });
}
