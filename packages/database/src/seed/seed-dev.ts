import { newDatabaseClient } from '../index.ts';
import { seedStaticData } from './data-static.ts';
import { seedDev } from './data-dev.ts';
import { loadConfig } from '../configuration/config.ts';
import { seedDevAuthorities } from './data-authorities-dev.ts';
import { seedDevLegacyCase } from './data-dev-legacy.ts';

async function run() {
	const config = loadConfig();

	const dbClient = newDatabaseClient(config.db);

	try {
		await seedStaticData(dbClient);
		await seedDevAuthorities(dbClient);
		await seedDev(dbClient);
		await seedDevLegacyCase(dbClient);
	} catch (error) {
		console.error(error);
		throw error;
	} finally {
		await dbClient.$disconnect();
	}
}

run();
