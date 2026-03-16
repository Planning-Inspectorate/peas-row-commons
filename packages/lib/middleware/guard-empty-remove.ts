import type { RequestHandler } from 'express';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';

/**
 * Guards the remove route against empty form submissions that would cause
 * OptionsQuestion.getDataToSave to call .trim() on undefined.
 * If there's no meaningful value in the body for this question, we just
 * redirect back to the case details page.
 */
export const guardEmptyRemove: RequestHandler = (req, res, next) => {
	const journey = res.locals.journey;
	const question = journey.getQuestionByParams(req.params);

	if (!question) {
		return res.redirect(journey.taskListUrl);
	}

	const value = req.body?.[question.fieldName];

	const isEmpty =
		value === undefined ||
		value === null ||
		value === '' ||
		(Array.isArray(value) && value.filter(Boolean).length === 0);

	if (isEmpty) {
		// Set the session data that triggers the "case updated" message.
		addSessionData(req, req.params.id, { updated: true });

		return res.redirect(journey.taskListUrl);
	}

	next();
};
