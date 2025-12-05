import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'url';
import type { BaseConfig } from '@pins/peas-row-commons-lib/app/config-types.d.ts';

export interface Config extends BaseConfig {
	appHostname: string;
	auth: {
		authority: string;
		clientId: string;
		clientSecret: string;
		disabled: boolean;
		groups: {
			// group ID for accessing the application
			applicationAccess: string;
		};
		redirectUri: string;
		signoutUrl: string;
	};
	entra: {
		cacheTtl: number;
	};
}

export type ENVIRONMENT_NAMES = Readonly<{ PROD: string; DEV: string; TEST: string; TRAINING: string }>;

/**
 * The environment names
 */
export const ENVIRONMENT_NAME: ENVIRONMENT_NAMES = Object.freeze({
	DEV: 'dev',
	TEST: 'test',
	TRAINING: 'training',
	PROD: 'prod'
});

// cache the config
let config: Config | undefined;

/**
 * Load configuration from the environment
 */
export function loadConfig(): Config {
	if (config) {
		return config;
	}
	// load configuration from .env file into process.env
	dotenv.config();

	// get values from the environment
	const {
		APP_HOSTNAME,
		AUTH_CLIENT_ID,
		AUTH_CLIENT_SECRET,
		AUTH_DISABLED,
		AUTH_GROUP_APPLICATION_ACCESS,
		AUTH_TENANT_ID,
		CACHE_CONTROL_MAX_AGE,
		GIT_SHA,
		LOG_LEVEL,
		PORT,
		NODE_ENV,
		REDIS_CONNECTION_STRING,
		SESSION_SECRET,
		SQL_CONNECTION_STRING,
		ENTRA_GROUP_CACHE_TTL
	} = process.env;

	const buildConfig = loadBuildConfig();

	if (!SESSION_SECRET) {
		throw new Error('SESSION_SECRET is required');
	}

	let httpPort = 8090;
	if (PORT) {
		// PORT is set by App Service
		const port = parseInt(PORT);
		if (isNaN(port)) {
			throw new Error('PORT must be an integer');
		}
		httpPort = port;
	}

	const isProduction = NODE_ENV === 'production';

	const authDisabled = AUTH_DISABLED === 'true' && !isProduction;
	if (!authDisabled) {
		const props = {
			AUTH_CLIENT_ID,
			AUTH_CLIENT_SECRET,
			AUTH_GROUP_APPLICATION_ACCESS,
			AUTH_TENANT_ID
		};
		for (const [k, v] of Object.entries(props)) {
			if (v === undefined || v === '') {
				throw new Error(k + ' must be a non-empty string');
			}
		}
	}

	const protocol = APP_HOSTNAME?.startsWith('localhost') ? 'http://' : 'https://';

	config = {
		appHostname: APP_HOSTNAME || '',
		auth: {
			authority: `https://login.microsoftonline.com/${AUTH_TENANT_ID}`,
			clientId: AUTH_CLIENT_ID || '',
			clientSecret: AUTH_CLIENT_SECRET || '',
			disabled: authDisabled,
			groups: {
				applicationAccess: AUTH_GROUP_APPLICATION_ACCESS || ''
			},
			redirectUri: `${protocol}${APP_HOSTNAME}/auth/redirect`,
			signoutUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout'
		},
		cacheControl: {
			maxAge: CACHE_CONTROL_MAX_AGE || '1d'
		},
		database: {
			connectionString: SQL_CONNECTION_STRING
		},
		gitSha: GIT_SHA,
		// the log level to use
		logLevel: LOG_LEVEL || 'info',
		NODE_ENV: NODE_ENV || 'development',
		// the HTTP port to listen on
		httpPort: httpPort,
		// the src directory
		srcDir: buildConfig.srcDir,
		session: {
			redisPrefix: 'manage:',
			redis: REDIS_CONNECTION_STRING,
			secret: SESSION_SECRET
		},
		// the static directory to serve assets from (images, css, etc..)
		staticDir: buildConfig.staticDir,
		entra: {
			// in minutes
			cacheTtl: parseInt(ENTRA_GROUP_CACHE_TTL || '15')
		}
	};

	return config;
}

export interface BuildConfig {
	srcDir: string;
	staticDir: string;
}

/**
 * Config required for the build script
 */
export function loadBuildConfig(): BuildConfig {
	// get the file path for the directory this file is in
	const dirname = path.dirname(fileURLToPath(import.meta.url));
	// get the file path for the src directory
	const srcDir = path.join(dirname, '..');
	// get the file path for the .static directory
	const staticDir = path.join(srcDir, '.static');

	return {
		srcDir,
		staticDir
	};
}

/**
 * Load the environment the application is running in. The value should be
 * one of the ENVIRONMENT_NAME values defined at the top of the file, and matches
 * the environment variable in the infrastructure code.
 */
export function loadEnvironmentConfig(): string {
	// load configuration from .env file into process.env
	dotenv.config();

	// get values from the environment
	const { ENVIRONMENT } = process.env;

	if (!ENVIRONMENT) {
		throw new Error('ENVIRONMENT is required');
	}

	if (!Object.values(ENVIRONMENT_NAME).includes(ENVIRONMENT)) {
		throw new Error(`ENVIRONMENT must be one of: ${Object.values(ENVIRONMENT_NAME)}`);
	}

	return ENVIRONMENT;
}
