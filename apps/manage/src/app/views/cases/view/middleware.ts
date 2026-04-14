import { INSPECTOR_CONSTANTS } from '@pins/peas-row-commons-lib/constants/inspectors.ts';
import {
	checkForInspectorErrors,
	validateInspectorRemoval
} from '@pins/peas-row-commons-lib/middleware/manage-list/validate-inspectors.ts';
import type { RequestHandler } from 'express';

/**
 * Map of error checks for questions
 */
const questionErrorLoaders = new Map<string, RequestHandler>([
	[INSPECTOR_CONSTANTS.INSPECTOR_URL, checkForInspectorErrors]
]);

/**
 * Map of validation checks for questions
 */
const questionValidationLoaders = new Map<string, RequestHandler>([
	[INSPECTOR_CONSTANTS.INSPECTOR_URL, validateInspectorRemoval]
]);

/**
 * Checks a map for specific errors for a question, e.g. for inspector-details
 * needs to see if there were any issues with removing the inspectors due to them
 * being assigned to procedures or outcomes
 */
export const loadQuestionSpecificErrors: RequestHandler = (req, res, next) => {
	const { question } = req.params;

	if (questionErrorLoaders.has(question)) {
		const specificMiddleware = questionErrorLoaders.get(question);
		if (typeof specificMiddleware === 'function') {
			return specificMiddleware(req, res, next);
		}
	}

	next();
};

/**
 * Checks a map for specific validation needed for a question, e.g. for inspector-details
 * it needs to check whether the users exist in Procedures & Outcomes before removing.
 */
export const loadQuestionSpecificValidation: RequestHandler = (req, res, next) => {
	const { question } = req.params;

	if (questionValidationLoaders.has(question)) {
		const specificMiddleware = questionValidationLoaders.get(question);
		if (typeof specificMiddleware === 'function') {
			return specificMiddleware(req, res, next);
		}
	}

	next();
};
