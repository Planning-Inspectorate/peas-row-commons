import { LogLevel } from '@azure/msal-node';
import type { Configuration } from '@azure/msal-node';
import type { Logger } from 'pino';
import type { Config } from '../app/config.ts';

export function buildMsalConfig({ config, logger }: { config: Config['auth']; logger: Logger }): Configuration {
	return {
		auth: {
			authority: config.authority,
			clientId: config.clientId,
			clientSecret: config.clientSecret
		},
		system: {
			loggerOptions: {
				/**
				 * @param {LogLevel} logLevel
				 * @param {string} message
				 * */
				loggerCallback(logLevel, message) {
					switch (logLevel) {
						case LogLevel.Error:
							logger.error(message);
							break;

						case LogLevel.Warning:
							logger.warn(message);
							break;

						case LogLevel.Info:
							logger.info(message);
							break;

						case LogLevel.Verbose:
							logger.debug(message);
							break;

						default:
							logger.trace(message);
					}
				},
				piiLoggingEnabled: false,
				logLevel: LogLevel.Warning
			}
		}
	};
}
