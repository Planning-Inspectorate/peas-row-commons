// Import the loadEnvFile function from the node:process module to load environment variables from a .env file
import { loadEnvFile } from 'node:process';
/**
 * Load configuration for seeding the database
 */
export function loadConfig(): { db: string } {
	// load configuration from .env file into process.env
	// prettier-ignore
	try {loadEnvFile()} catch {/* ignore errors*/}

	const db = process.env.SQL_CONNECTION_STRING;
	if (!db) {
		throw new Error('SQL_CONNECTION_STRING is required');
	}
	return { db };
}
