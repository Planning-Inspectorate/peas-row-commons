import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { createFoldersViewModel } from '../view-model.ts';
import { createDocumentsViewModel } from './view-model.ts';
import { getPageData, getPaginationParams } from '../../../pagination/pagination-utils.ts';
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';
import { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import type { Request } from 'express';

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

		const [folderUpdated, folderCreated, folderDeleted, folderRenamed] = readAndClearSessionData(req);

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
						where: { caseId: id, deletedAt: null }
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

		// We now generate this in TS rather than inside of Nunjucls
		const paginationItems = getPaginationModel(req, totalPages, pageNumber);

		const paginationParams = {
			selectedItemsPerPage,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			totalDocuments,
			uiItems: paginationItems
		};

		const subFoldersViewModel = subFolders ? createFoldersViewModel(subFolders) : [];

		const documentsViewModel = documents ? createDocumentsViewModel(documents, PREVIEW_MIME_TYPES) : [];

		const baseFoldersUrl = `/cases/${id}/case-folders`;

		return res.render('views/cases/case-folders/case-folder/view.njk', {
			pageHeading: caseRow?.name,
			reference: caseRow?.reference,
			folderName: currentFolder?.displayName,
			backLinkUrl: parentFolder
				? baseFoldersUrl + `/${parentFolder.id}/${stringToKebab(parentFolder.displayName)}`
				: baseFoldersUrl,
			baseFoldersUrl: baseFoldersUrl, // Used for creating the url of the sub-folders
			subFolders: subFoldersViewModel,
			currentUrl: req.originalUrl,
			documents: documentsViewModel,
			paginationParams,
			folderUpdates: {
				folderUpdated,
				folderCreated,
				folderDeleted,
				folderRenamed
			}
		});
	};
}

/**
 * Reads session data for adding files (updating folder),
 * creating folders, and deleting folders, and renaming folders
 * then wipes them from session so that the user doesn't see it on refresh repeatedly.
 *
 * We use the case id for creating and deleting because they are accessed
 * outside of the folder view, but folder updating is about uploading files
 * to a folder, so we use its own id, same with renaming.
 */
function readAndClearSessionData(req: Request) {
	const { id, folderId } = req.params;

	const folderUpdated = readSessionData(req, folderId, 'updated', false, 'folder');
	const folderCreated = readSessionData(req, id, 'created', false, 'folder');
	const folderDeleted = readSessionData(req, id, 'deleted', false, 'folder');
	const folderRenamed = readSessionData(req, folderId, 'renamed', false, 'folder');

	clearSessionData(req, folderId, 'updated', 'folder');
	clearSessionData(req, id, 'created', 'folder');
	clearSessionData(req, id, 'deleted', 'folder');
	clearSessionData(req, folderId, 'renamed', 'folder');

	return [folderUpdated, folderCreated, folderDeleted, folderRenamed];
}
