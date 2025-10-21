import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';
import type { ErrorRequestHandler, Request, Response } from 'express';

/**
 * A catch-all error handler to use as express middleware
 */
export function buildDefaultErrorHandlerMiddleware(logger: Logger): ErrorRequestHandler {
	return (error, req, res, next) => {
		const wrappedError = wrapPrismaErrors(error);
		const message = wrappedError.message || 'unknown error';
		logger.error(error, message); // log the original error to include full details

		if (res.headersSent) {
			next(error);
			return;
		}

		// make sure we don't use an invalid code
		const code = error.statusCode && error.statusCode > 399 ? error.statusCode : 500;
		res.status(code);
		res.render(`views/layouts/error`, {
			pageTitle: 'Sorry, there was an error',
			messages: [message, 'Try again later']
		});
	};
}

/**
 * Wrap prisma errors so they are not shown directly to users.
 * This is a fallback, controllers should handle Prisma validation errors directly so that error messages can be specific
 */
export function wrapPrismaErrors(error: Error): Error {
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		return new Error(`Request could not be handled (code: ${error.code})`);
	}
	if (error instanceof Prisma.PrismaClientUnknownRequestError) {
		return new Error(`Request could not be handled (code: unknown)`);
	}
	if (error instanceof Prisma.PrismaClientValidationError) {
		return new Error(`Request could not be handled (code: validation)`);
	}
	if (error instanceof Prisma.PrismaClientInitializationError) {
		let code = error.errorCode;
		if (!code && error.message.toLowerCase().includes(`can't reach database server`)) {
			code = 'P1001';
		}
		return new Error(`Connection error (code: ${code || 'unknown'})`);
	}
	return error;
}

/**
 * A catch-all handler to serve a 404 page
 */
export function notFoundHandler(req: Request, res: Response) {
	res.status(404);
	res.render(`views/layouts/error`, {
		pageTitle: 'Page not found',
		messages: [
			'If you typed the web address, check it is correct.',
			'If you pasted the web address, check you copied the entire address.'
		]
	});
}
