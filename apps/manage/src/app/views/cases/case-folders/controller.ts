import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { createFoldersViewModel } from './view-model.ts';
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';

export function buildViewCaseFolders(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}

		const folderCreated = readSessionData(req, id, 'created', false, 'folder');

		// Clear created flag if present so that we only see it once.
		clearSessionData(req, id, 'created', 'folder');

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
					where: { caseId: id, parentFolderId: null } // Only get top level folders for this view.
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
			folderCreated
		});
	};
}
