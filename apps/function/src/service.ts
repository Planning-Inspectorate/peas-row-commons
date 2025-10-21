import { newDatabaseClient } from '@pins/peas-row-commons-database';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Config } from './config.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class FunctionService {
	#config: Config;
	dbClient: PrismaClient;

	constructor(config: Config) {
		this.#config = config;
		if (!config.database.connectionString) {
			throw new Error('database connectionString is required');
		}
		this.dbClient = newDatabaseClient(config.database.connectionString);
	}

	get exampleSchedule() {
		return this.#config.example.schedule;
	}
}
