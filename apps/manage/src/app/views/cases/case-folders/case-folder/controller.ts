import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { createFoldersViewModel } from '../view-model.ts';
import { createDocumentsViewModel } from './view-model.ts';

export function buildViewCaseFolder(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const id = req.params.id;
		const folderId = req.params.folderId;

		if (!id) {
			throw new Error('id param required');
		}

		if (!folderId) {
			throw new Error('folderId param required');
		}

		let caseRow, currentFolder, subFolders, documents;
		try {
			[caseRow, currentFolder, subFolders, documents] = await Promise.all([
				db.case.findUnique({
					select: {
						reference: true,
						name: true
					},
					where: { id }
				}),
				db.folder.findUnique({
					where: { id: folderId }
				}),
				db.folder.findMany({
					where: { caseId: id, parentFolderId: folderId } // Get children of parent
				}),
				db.document.findMany({
					where: { caseId: id, folderId }
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

		if (!caseRow || !currentFolder) {
			return notFoundHandler(req, res);
		}

		const subFoldersViewModel = subFolders ? createFoldersViewModel(subFolders) : [];

		const documentsViewModel = documents ? createDocumentsViewModel(documents) : [];

		const baseFoldersUrl = `/cases/${id}/case-folders`;

		return res.render('views/cases/case-folders/case-folder/view.njk', {
			pageHeading: caseRow?.name,
			reference: caseRow?.reference,
			folderName: currentFolder?.displayName,
			backLinkUrl: baseFoldersUrl,
			baseFoldersUrl, // Used for creating the url of the sub-folders
			subFolders: subFoldersViewModel,
			currentUrl: req.originalUrl,
			documents: documentsViewModel
		});
	};
}
