import { loadConfig } from '../configuration/config.ts';
import { newDatabaseClient } from '../index.ts';
import { seedDevAuthorities } from './data-authorities-dev.ts';
import { seedDev } from './data-dev.ts';
import { seedStaticData } from './data-static.ts';

async function run() {
	const config = loadConfig();

	const dbClient = newDatabaseClient(config.db);

	try {
		await seedStaticData(dbClient);
		await seedDevAuthorities(dbClient);
		await seedDev(dbClient);
	} catch (error) {
		console.error(error);
		throw error;
	} finally {
		await dbClient.$disconnect();
	}
}

run();
