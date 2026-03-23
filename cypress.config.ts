import { defineConfig } from 'cypress';
import { setupNodeEvents } from './cypress/support/tasks.ts';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
	e2e: {
		screenshotOnRunFailure: false,
		chromeWebSecurity: false,
		baseUrl: process.env.BASE_URL,

		env: {
			adminUsername: process.env.ADMIN_EMAIL,
			adminPassword: process.env.ADMIN_PASSWORD
		},

		setupNodeEvents
	}
});
