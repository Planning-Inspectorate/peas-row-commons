import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { Request } from 'express';
import { checkAnswerlength, checkRequiredAnswer } from '@pins/peas-row-commons-lib/util/strings.ts';
import { getStringParam, getOptionalStringParam } from '@pins/peas-row-commons-lib/util/params.ts';
import { GENERAL_CONSTANTS } from '@pins/peas-row-commons-lib/constants/general.ts';

export function buildValidateCaseNotesMiddleware(): AsyncRequestHandler {
	return async (req, res, next) => {
		const id = getStringParam(req.params, 'id');
		const noteId = getOptionalStringParam(req.params, 'noteId');

		const errors = generateCaseNoteErrors(req);
		if (errors.length) {
			// If editing a note, re-render the edit page with errors
			// res.locals.reference and res.locals.caseNote are populated by buildPreloadCaseNoteData middleware
			if (noteId) {
				return res.render('views/cases/case-notes/edit.njk', {
					pageHeading: 'Change note',
					reference: res.locals.reference,
					backLinkUrl: `/cases/${id}`,
					backLinkText: 'Back to case details',
					currentUrl: req.originalUrl,
					comment: req.body?.comment ?? res.locals.caseNote?.comment,
					characterLimit: GENERAL_CONSTANTS.CASE_NOTE_MAX_LENGTH,
					errors: errors.map((error) => ({ text: error!.text, href: '#comment' })),
					errorMessage: errors[0]!.text
				});
			}

			// For creating new notes, redirect back to case details
			addSessionData(req, id, { updateErrors: errors }, 'cases');
			const url = req.baseUrl.replace(/\/case-notes\/?$/, '');
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

	errors.push(
		checkAnswerlength(
			comment,
			`Case note must be ${GENERAL_CONSTANTS.CASE_NOTE_MAX_LENGTH} characters or less`,
			req.baseUrl,
			GENERAL_CONSTANTS.CASE_NOTE_MAX_LENGTH
		)
	);

	return errors.filter((error) => error);
}
