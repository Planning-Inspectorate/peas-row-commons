import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { isValidUuidFormat } from '../util/uuid.ts';
import { notFoundHandler } from './errors.ts';

/**
 * Factory function that creates a middleware to validate a route parameter is a valid UUID format.
 * Returns 404 via notFoundHandler if the parameter is missing or invalid.
 *
 * @param paramName - The name of the route parameter to validate
 * @returns Express middleware function
 */
export function buildValidateParamFormat(paramName: string): RequestHandler {
	return function validateParamFormat(req: Request, res: Response, next: NextFunction) {
		const value = req.params[paramName];

		if (!value || typeof value !== 'string' || !isValidUuidFormat(value)) {
			return notFoundHandler(req, res);
		}

		next();
	};
}

/**
 * Middleware to validate req.params.id is a valid UUID format.
 * Returns 404 if invalid or missing.
 */
export const validateIdFormat = buildValidateParamFormat('id');

/**
 * Middleware to validate req.params.noteId is a valid UUID format.
 * Returns 404 if invalid or missing.
 */
export const validateNoteIdFormat = buildValidateParamFormat('noteId');
