import { defineConfig } from 'cypress';
import * as dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export default defineConfig({
	e2e: {
		baseUrl: process.env.BASE_URL,

		env: {
			adminUsername: requireEnv('ADMIN_EMAIL'),
			adminPassword: requireEnv('ADMIN_PASSWORD')
		}
	}
});
