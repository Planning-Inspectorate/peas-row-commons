import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';

/**
 * Where clause cannot include an undefined ID, so either return a valid where clause or none
 */
export function optionalWhere(id: string): undefined | { id: string } {
	if (id) {
		return { id };
	}
	return undefined;
}

interface WrapPrismaErrorOptions {
	error: Error;
	logger: Logger;
	message: string;
	logParams: Record<string, any>;
}

/**
 * Wrap common Prisma errors so they aren't shown to the user
 */
export function wrapPrismaError({ error, logger, message, logParams }: WrapPrismaErrorOptions) {
	// don't show Prisma errors to the user
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		logger.error({ error, ...logParams }, `error ${message}`);
		throw new Error(`Error ${message} (${error.code})`);
	}
	if (error instanceof Prisma.PrismaClientValidationError) {
		logger.error({ error, ...logParams }, `error ${message}`);
		throw new Error(`Error ${message} (${error.name})`);
	}
	throw error;
}
