import type { Request } from 'express';
import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { createFoldersViewModel } from '../view-model.ts';
import { buildBreadcrumbItems } from '../folder-utils.ts';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import { createDocumentsViewModel, type DocumentWithUserDocuments } from './view-model.ts';
import { getPageData, getPaginationParams } from '../../../pagination/pagination-utils.ts';
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';
import { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';
import { stringToKebab } from '@pins/peas-row-commons-lib/util/strings.ts';
import type { FolderBreadcrumb } from '../types.ts';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from '../../move-file/journey/journey.ts';
import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/status.ts';
import {
	DocumentFilterGenerator,
	DOCUMENT_FILTER_VALUES
} from '@pins/peas-row-commons-lib/util/user-document-filter-generator.ts';
import { determineDefaultStatuses } from '@pins/peas-row-commons-lib/util/user-document-status.ts';

export function buildViewCaseFolder(
	service: ManageService,
	FilterGenerator = DocumentFilterGenerator
): AsyncRequestHandler {
	const { db, logger } = service;
	const filterGenerator = new FilterGenerator();

	return async (req, res, next) => {
		const id = req.params.id;
		const folderId = req.params.folderId;
		const userId = req?.session?.account?.localAccountId;

		if (!id) {
			throw new Error('id param required');
		}

		if (!folderId) {
			throw new Error('folderId param required');
		}

		if (!userId) {
			throw new Error('userId required for folder documents');
		}

		const [folderUpdated, folderCreated, folderDeleted, folderRenamed, filesMoved, filesDeleted, errorSummary] =
			readAndClearSessionData(req);

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		try {
			const caseData = await db.case.findUnique({
				select: { reference: true, name: true, statusId: true, legacyCaseId: true },
				where: { id }
			});

			if (!caseData) {
				return notFoundHandler(req, res);
			}

			const { defaultIsRead, defaultIsFlagged } = determineDefaultStatuses({
				legacyCaseId: caseData.legacyCaseId,
				statusId: caseData.statusId,
				closedStatuses: [
					CASE_STATUS_ID.CLOSED_OPENED_IN_ERROR,
					CASE_STATUS_ID.INVALID,
					CASE_STATUS_ID.WITHDRAWN,
					CASE_STATUS_ID.REJECTED,
					CASE_STATUS_ID.CANCELLED,
					CASE_STATUS_ID.CLOSED
				]
			});

			const dynamicDocumentWhere = filterGenerator.createPrismaDocumentWhere(
				req.query,
				userId,
				defaultIsRead,
				defaultIsFlagged
			);

			const baseDocumentWhere = {
				caseId: id,
				folderId: folderId,
				deletedAt: null
			};

			const [folderData, paginatedDocuments, totalFilteredDocuments, allDocumentStatuses, allDocumentsCount] =
				await Promise.all([
					db.folder.findUnique({
						where: { id: folderId },
						include: {
							ChildFolders: { where: { caseId: id, deletedAt: null } },
							ParentFolder: { select: { id: true, displayName: true } }
						}
					}),
					db.document.findMany({
						where: { ...baseDocumentWhere, ...dynamicDocumentWhere },
						skip: skipSize,
						take: pageSize,
						include: {
							Folder: true,
							UserDocuments: { where: { User: { idpUserId: userId } } }
						},
						orderBy: { uploadedDate: 'desc' }
					}),
					db.document.count({
						where: { ...baseDocumentWhere, ...dynamicDocumentWhere }
					}),
					db.document.findMany({
						where: baseDocumentWhere,
						select: {
							UserDocuments: {
								where: { User: { idpUserId: userId } },
								select: { readStatus: true, flaggedStatus: true }
							}
						}
					}),
					db.document.count({
						where: baseDocumentWhere
					})
				]);

			if (!folderData) {
				return notFoundHandler(req, res);
			}

			const counts = calculateCountsForFilter(allDocumentStatuses, defaultIsRead, defaultIsFlagged);

			const currentPath = req.originalUrl.split('?')[0];
			const filterViewModel = filterGenerator.generateFilters(req.query, currentPath, counts);

			const folderPath = await getFolderPath(db, folderId);
			const breadcrumbItems = buildBreadcrumbItems(id, folderPath);

			const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
				totalFilteredDocuments,
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
				totalFilteredDocuments,
				totalDocuments: allDocumentsCount,
				uiItems: getPaginationModel(req, totalPages, pageNumber),
				filtersValue: filterGenerator.createCurrentlySelectedFilterValues(req.query)
			};

			const subFoldersViewModel = folderData.ChildFolders ? createFoldersViewModel(folderData.ChildFolders) : [];
			const documentsViewModel = paginatedDocuments
				? createDocumentsViewModel(paginatedDocuments, caseData, PREVIEW_MIME_TYPES)
				: [];

			const baseFoldersUrl = `/cases/${id}/case-folders`;

			// Makes sure that we don't have any lingering session data from half-completed MOVE journeys
			clearDataFromSession({ req, journeyId: JOURNEY_ID });

			return res.render('views/cases/case-folders/case-folder/view.njk', {
				pageHeading: caseData.name,
				reference: caseData.reference,
				folderName: folderData.displayName,
				backLinkUrl: folderData.ParentFolder
					? baseFoldersUrl + `/${folderData.ParentFolder.id}/${stringToKebab(folderData.ParentFolder.displayName)}`
					: baseFoldersUrl,
				baseFoldersUrl: baseFoldersUrl, // Used for creating the url of the sub-folders
				subFolders: subFoldersViewModel,
				currentUrl: req.originalUrl,
				currentPath: currentPath,
				documents: documentsViewModel,
				paginationParams,
				filterData: filterViewModel,
				folderUpdates: {
					folderUpdated,
					folderCreated,
					folderDeleted,
					folderRenamed,
					filesMoved,
					filesDeleted
				},
				errorSummary,
				breadcrumbItems,
				caseId: id
			});
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'fetching folder',
					logParams: { caseId: id, folderId }
				});
			}

			if (next) next(error);
		}
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
	const filesDeleted = readSessionData(req, id, 'filesDeleted', false, 'folder');
	const folderCreated = readSessionData(req, id, 'created', false, 'folder');
	const folderDeleted = readSessionData(req, id, 'deleted', false, 'folder');

	const errorSummary = readSessionData(req, id, 'filesErrors', false, 'folder');

	clearSessionData(req, folderId, 'updated', 'folder');
	clearSessionData(req, folderId, 'renamed', 'folder');
	clearSessionData(req, folderId, 'filesMoved', 'folder');
	clearSessionData(req, id, 'filesDeleted', 'folder');
	clearSessionData(req, id, 'created', 'folder');
	clearSessionData(req, id, 'deleted', 'folder');

	clearSessionData(req, id, 'filesErrors', 'folder');

	return [folderUpdated, folderCreated, folderDeleted, folderRenamed, filesMoved, filesDeleted, errorSummary];
}

/**
 * Takes DB count for number of documents with a certain status and calculates the rows.
 */
function calculateCountsForFilter(
	allDocumentStatuses: DocumentWithUserDocuments[],
	defaultIsRead: boolean,
	defaultIsFlagged: boolean
) {
	const counts = {
		[DOCUMENT_FILTER_VALUES.READ]: 0,
		[DOCUMENT_FILTER_VALUES.UNREAD]: 0,
		[DOCUMENT_FILTER_VALUES.FLAGGED]: 0,
		[DOCUMENT_FILTER_VALUES.UNFLAGGED]: 0
	};

	allDocumentStatuses.forEach((doc) => {
		const userState = doc.UserDocuments[0];
		const isRead = userState ? userState.readStatus : defaultIsRead;
		const isFlagged = userState ? userState.flaggedStatus : defaultIsFlagged;
		counts[isRead ? DOCUMENT_FILTER_VALUES.READ : DOCUMENT_FILTER_VALUES.UNREAD]++;
		counts[isFlagged ? DOCUMENT_FILTER_VALUES.FLAGGED : DOCUMENT_FILTER_VALUES.UNFLAGGED]++;
	});

	return counts;
}
