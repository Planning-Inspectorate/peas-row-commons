import type { AsyncRequestHandlerWithBody } from '@planning-inspectorate/core/util';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms';
import type { RequestHandler } from 'express';

type RemoveHandler = AsyncRequestHandlerWithBody<{ remove?: string }>;

/**
 * For manage list item removals we need to track the ids selected to be removed, this is needed
 * specifically for reconciling the differences between session & DB where if we don't do this
 * then the DB will overwrite the session meaning the items are not correctly removed.
 */
export const trackRemovedItemId: RemoveHandler = async (req, res, next) => {
	const { manageListAction, manageListItemId } = req.params;
	const { remove } = req.body;

	if (manageListAction === MANAGE_LIST_ACTIONS.REMOVE && manageListItemId && remove === 'remove') {
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
