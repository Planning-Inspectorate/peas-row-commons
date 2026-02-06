import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { createFoldersViewModel } from '../view-model.ts';
import { buildBreadcrumbItems } from '../folder-utils.ts';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { createDocumentsViewModel } from './view-model.ts';
import { getPageData, getPaginationParams } from '../../../pagination/pagination-utils.ts';
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';
import { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import type { Request } from 'express';
import type { FolderBreadcrumb } from '../types.ts';

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

		const [folderUpdated, folderCreated, folderDeleted, folderRenamed, filesMoved, errorSummary] =
			readAndClearSessionData(req);

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
						include: {
							Folder: true
						},
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

		const folderPath = await getFolderPath(db, folderId);
		const breadcrumbItems = buildBreadcrumbItems(id, folderPath);

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
				folderRenamed,
				filesMoved
			},
			errorSummary,
			breadcrumbItems
		});
	};
}

/**
 * Fetches the folder path (ancestry chain) from current folder up to root.
 * Returns folders in order from root to current folder.
 */
export async function getFolderPath(db: PrismaClient, folderId: string): Promise<FolderBreadcrumb[]> {
	const currentFolder = await db.folder.findUnique({
		where: { id: folderId },
		select: { caseId: true }
	});

	if (!currentFolder?.caseId) return [];

	const allFolders = await db.folder.findMany({
		where: { caseId: currentFolder.caseId },
		select: {
			id: true,
			displayName: true,
			parentFolderId: true
		}
	});

	const folderMap = new Map(allFolders.map((folder) => [folder.id, folder]));

	// Walk up the tree in memory
	const folderPath: FolderBreadcrumb[] = [];
	let currentId: string | null = folderId;

	while (currentId) {
		const folder = folderMap.get(currentId);
		if (!folder) break;

		folderPath.push(folder);
		currentId = folder.parentFolderId;
	}

	return folderPath.reverse();
}

/**
 * Reads session data for adding files (updating folder),
 * creating folders, deleting folders, renaming folders, moving files, errors
 * then wipes them from session so that the user doesn't see it on refresh repeatedly.
 *
 * We use the case id for creating and deleting because they are accessed
 * outside of the folder view, but folder updating is about uploading files
 * to a folder, so we use its own id, same with renaming and moving files.
 */
function readAndClearSessionData(req: Request) {
	const { id, folderId } = req.params;

	const folderUpdated = readSessionData(req, folderId, 'updated', false, 'folder');
	const folderRenamed = readSessionData(req, folderId, 'renamed', false, 'folder');
	const filesMoved = readSessionData(req, folderId, 'filesMoved', false, 'folder');
	const folderCreated = readSessionData(req, id, 'created', false, 'folder');
	const folderDeleted = readSessionData(req, id, 'deleted', false, 'folder');

	const errorSummary = readSessionData(req, id, 'moveFilesErrors', false, 'folder');

	clearSessionData(req, folderId, 'updated', 'folder');
	clearSessionData(req, folderId, 'renamed', 'folder');
	clearSessionData(req, folderId, 'filesMoved', 'folder');
	clearSessionData(req, id, 'created', 'folder');
	clearSessionData(req, id, 'deleted', 'folder');

	clearSessionData(req, id, 'moveFilesErrors', 'folder');

	return [folderUpdated, folderCreated, folderDeleted, folderRenamed, filesMoved, errorSummary];
}
