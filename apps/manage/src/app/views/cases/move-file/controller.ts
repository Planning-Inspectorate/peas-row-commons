import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { addSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { RequestHandler } from 'express';
import { AUDIT_ACTIONS } from '../../../audit/actions.ts';

/**
 * Controller used for the POST request when a user sends files to move,
 * does some validation and saves the files to the request object session.
 *
 * Then redirects to the GET url of the same endpoint (buildViewMoveFiles)
 */
export function buildHandleMoveSelection(): RequestHandler {
	return async (req, res) => {
		const { selectedFiles } = req.body;
		const { id } = req.params;

		// If no files, just refresh and show the error.
		if (!selectedFiles) {
			addSessionData(
				req,
				id,
				{
					moveFilesErrors: [
						{
							text: 'Select file to move',
							href: '#'
						}
					]
				},
				'folder'
			);

			const returnUrl = req.baseUrl.replace(/\/move-files\/?$/, '');
			return res.redirect(returnUrl);
		}

		const fileIds = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];

		req.session.moveFilesIds = fileIds;

		return res.redirect(req.baseUrl);
	};
}

/**
 * Controller for getting the view that shows all the selected files ready to move.
 *
 * Because the files are in the request object's session, they will be accessible at
 * the end of the Journey ready to update.
 */
export function buildViewMoveFiles(service: ManageService): RequestHandler {
	const { db, audit } = service;

	return async (req, res) => {
		const fileIds = Array.isArray(req.session.moveFilesIds) ? req.session.moveFilesIds : [];

		if (!fileIds || fileIds.length === 0) {
			const returnUrl = req.baseUrl.replace(/\/move-files\/?$/, '');
			return res.redirect(returnUrl);
		}

		const documents = await db.document.findMany({
			where: {
				id: { in: fileIds }
			},
			select: {
				id: true,
				fileName: true
			}
		});

		if (!documents) return notFoundHandler(req, res);

		const returnUrl = req.baseUrl.replace(/\/move-files\/?$/, '');

		await audit.record({
			caseId: req.params.id,
			action: AUDIT_ACTIONS.FILE_MOVED,
			userId: req?.session?.account?.localAccountId || 'unknown'
		});

		return res.render('views/cases/move-file/view.njk', {
			pageHeading: documents.length > 1 ? 'Move files' : 'Move file',
			documents,
			backLinkUrl: returnUrl,
			currentUrl: req.originalUrl
		});
	};
}
