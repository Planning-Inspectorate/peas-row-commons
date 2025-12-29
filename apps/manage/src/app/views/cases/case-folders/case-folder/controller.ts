import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { createFoldersViewModel } from '../view-model.ts';
import { createDocumentsViewModel } from './view-model.ts';
import { getPageData, getPaginationParams } from '../../../pagination/pagination-utils.ts';
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';

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

		const folderUpdated = readSessionData(req, folderId, 'updated', false, 'folder');

		// Clear updated flag if present so that we only see it once.
		clearSessionData(req, folderId, 'updated', 'folder');

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		let caseRow, currentFolder, subFolders, documents, totalDocuments, parentFolder;
		try {
			const folderData = await db.folder.findUnique({
				where: {
					id: folderId
				},
				include: {
					Case: {
						select: {
							reference: true,
							name: true
						}
					},
					ChildFolders: {
						where: { caseId: id }
					},
					Documents: {
						where: { caseId: id, deletedAt: null },
						skip: skipSize,
						take: pageSize
					},
					_count: {
						select: {
							Documents: {
								where: { caseId: id, deletedAt: null }
							}
						}
					},
					ParentFolder: {
						select: {
							id: true,
							displayName: true
						}
					}
				}
			});

			if (!folderData) throw new Error('Folder not found');

			const { Case, ChildFolders, Documents, _count, ParentFolder, ...restOfFolder } = folderData;

			caseRow = Case;
			currentFolder = restOfFolder;
			subFolders = ChildFolders;
			documents = Documents;
			totalDocuments = _count.Documents;
			parentFolder = ParentFolder;
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching folders',
				logParams: {}
			});
		}

		if (!caseRow || !currentFolder || Number.isNaN(totalDocuments)) {
			return notFoundHandler(req, res);
		}

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalDocuments || 0,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

		const paginationParams = {
			selectedItemsPerPage,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			totalDocuments
		};

		const subFoldersViewModel = subFolders ? createFoldersViewModel(subFolders) : [];

		const documentsViewModel = documents ? createDocumentsViewModel(documents, PREVIEW_MIME_TYPES) : [];

		const baseFoldersUrl = `/cases/${id}/case-folders`;

		return res.render('views/cases/case-folders/case-folder/view.njk', {
			pageHeading: caseRow?.name,
			reference: caseRow?.reference,
			folderName: currentFolder?.displayName,
			backLinkUrl: parentFolder
				? baseFoldersUrl + `/${parentFolder.id}/${encodeURIComponent(parentFolder.displayName)}`
				: baseFoldersUrl,
			baseFoldersUrl: baseFoldersUrl, // Used for creating the url of the sub-folders
			subFolders: subFoldersViewModel,
			currentUrl: req.originalUrl,
			documents: documentsViewModel,
			paginationParams,
			folderUpdated
		});
	};
}
