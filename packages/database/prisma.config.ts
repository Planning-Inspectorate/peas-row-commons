import { defineConfig } from 'prisma/config';
import path from 'node:path';
import { loadEnvFile } from 'node:process';

// load configuration from .env file into process.env
// prettier-ignore
try { loadEnvFile(); } catch {/* ignore errors*/}

export default defineConfig({
	schema: path.join('src', 'schema.prisma'),
	migrations: {
		path: path.join('src', 'migrations'),
		seed: 'node src/seed/seed-dev.ts'
	},
	datasource: {
		url: process.env.SQL_CONNECTION_STRING_ADMIN || ''
	}
});
