import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { Request } from 'express';

export function buildValidateCaseNotesMiddleware(): AsyncRequestHandler {
	return async (req, res, next) => {
		const { id } = req.params;

		if (!id) {
			throw new Error('id param required');
		}

		const errors = generateCaseNoteErrors(req);
		if (errors.length) {
			addSessionData(req, id, { updateErrors: errors }, 'cases');
			const url = req.baseUrl.replace(/\/case-note\/?$/, '');
			return res.redirect(url);
		}

		if (next) next();
	};
}

/**
 * Checks if the case notes are valid.
 */
function generateCaseNoteErrors(req: Request) {
	const { comment } = req.body;

	const errors = [];

	errors.push(checkRequiredAnswer(comment, 'Enter a case note', req.baseUrl));

	errors.push(checkAnswerlength(comment, 'Case note must be 500 characters or less', req.baseUrl));

	return errors.filter((error) => error);
}

/**
 * Checks if a provided answer is not empty, returns an error ready object if it is empty.
 */
function checkRequiredAnswer(value: string, errorMessage: string, pageLink: string) {
	if (typeof value === 'undefined' || value === '' || value === null) {
		return {
			text: errorMessage,
			href: pageLink
		};
	}
}

/**
 * Check that answer string is under certain character length
 */
function checkAnswerlength(value: string, errorMessage: string, pageLink: string, length = 150) {
	if (value.length > length) {
		return {
			text: errorMessage,
			href: pageLink
		};
	}
}
