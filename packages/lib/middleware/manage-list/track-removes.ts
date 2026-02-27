import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import type { RequestHandler } from 'express';
import { question } from '@planning-inspectorate/dynamic-forms/src/controller.js';

/**
 * The dynamic-forms remove functionality is built on the idea of a single POST
 * request, however our design is a form with a YES/NO response, meaning we need
 * a bouncer middleware to check for a NO response and redirect if we see this.
 *
 * The 4 scenarios are:
 *
 * 1) It is a remove POST and the user selected yes -> let them through
 * 2) It is a remove POST and the user selected no -> bounce them
 * 3) It is a remove POST and the user selected nothing -> reload with an error
 * 4) It is NOT a remove post -> let them through
 */
export const bounceRemoveCancellation: AsyncRequestHandler = async (req, res, next) => {
	const { manageListAction, manageListItemId } = req.params;
	const { remove } = req.body;

	if (manageListAction === MANAGE_LIST_ACTIONS.REMOVE && manageListItemId) {
		if (remove !== BOOLEAN_OPTIONS.YES && remove !== BOOLEAN_OPTIONS.NO) {
			const errorMessage = 'Select yes if you want to remove this item';

			res.locals = res.locals || {};
			res.locals.errorSummary = [{ text: errorMessage, href: '#remove' }];

			return question(req, res, next);
		}

		if (remove === BOOLEAN_OPTIONS.NO) {
			const returnUrl = req.originalUrl.split('/remove/')[0];
			return res.redirect(returnUrl);
		}
	}

	if (next) next();
};

/**
 * For manage list item removals we need to track the ids selected to be removed, this is needed
 * specifically for reconciling the differences between session & DB where if we don't do this
 * then the DB will overwrite the session meaning the items are not correctly removed.
 */
export const trackRemovedItemId: AsyncRequestHandler = async (req, res, next) => {
	const { manageListAction, manageListItemId } = req.params;
	const { remove } = req.body;

	if (manageListAction === MANAGE_LIST_ACTIONS.REMOVE && manageListItemId && remove === BOOLEAN_OPTIONS.YES) {
		req.session.removedListItems ??= [];
		if (!req.session.removedListItems.includes(manageListItemId)) {
			req.session.removedListItems.push(manageListItemId);
		}
	}

	if (next) next();
};

/**
 * removedListItems are stored in order to figure out why items need to be hidden
 * from the user after they have been removed in session but not in DB yet.
 *
 * We want to clear this when we reload the main view.
 */
export const resetRemovedListItems: RequestHandler = (req, res, next) => {
	if (req.session) req.session.removedListItems = [];
	if (next) next();
};
