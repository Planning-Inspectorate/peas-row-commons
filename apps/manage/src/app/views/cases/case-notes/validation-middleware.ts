import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { Request } from 'express';
import { checkAnswerlength, checkRequiredAnswer } from '@pins/peas-row-commons-lib/util/strings.ts';

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

	errors.push(checkAnswerlength(comment, 'Case note must be 500 characters or less', req.baseUrl, 500));

	return errors.filter((error) => error);
}
