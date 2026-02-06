import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { createFoldersViewModel } from './view-model.ts';
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { Request } from 'express';

export function buildViewCaseFolders(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}

		const [folderCreated, folderDeleted] = readAndClearSessionData(req);

		let caseRow, folders;
		try {
			[caseRow, folders] = await Promise.all([
				db.case.findUnique({
					select: {
						name: true,
						reference: true
					},
					where: { id }
				}),
				db.folder.findMany({
					where: { caseId: id, parentFolderId: null, deletedAt: null } // Only get top level folders for this view.
				})
			]);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching folders',
				logParams: {}
			});
		}

		if (!caseRow || !folders) {
			return notFoundHandler(req, res);
		}

		const foldersViewModel = createFoldersViewModel(folders);

		return res.render('views/cases/case-folders/view.njk', {
			pageHeading: caseRow?.name,
			reference: caseRow?.reference,
			backLinkUrl: `/cases/${id}`,
			backLinkText: 'Back to case details',
			folders: foldersViewModel,
			currentUrl: req.originalUrl,
			folderCreated,
			folderDeleted
		});
	};
}

/**
 * Reads session data for creating and deleting folders, then wipes them from session
 * so that the user doesn't see it on refresh repeatedly.
 */
function readAndClearSessionData(req: Request) {
	const { id } = req.params;

	const folderCreated = readSessionData(req, id, 'created', false, 'folder');
	const folderDeleted = readSessionData(req, id, 'deleted', false, 'folder');

	clearSessionData(req, id, 'created', 'folder');
	clearSessionData(req, id, 'deleted', 'folder');

	return [folderCreated, folderDeleted];
}
