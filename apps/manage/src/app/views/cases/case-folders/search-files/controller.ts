import type { ManageService } from '#service';
import { createWhereClause, sanitiseSearchQuery } from '@pins/peas-row-commons-lib/util/search-queries.ts';
import type { RequestHandler } from 'express';
import { createDocumentsViewModel } from '../case-folder/view-model.ts';
import { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';
import { getPageData, getPaginationParams } from '../../../pagination/pagination-utils.ts';
import { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';
import type { Request } from 'express';
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';

/**
 * Controller for viewing the file search page, handles the pagination and select of the files.
 */
export function buildFileSearchView(service: ManageService): RequestHandler {
	const { db } = service;

	return async (req, res) => {
		const { id } = req.params;
		const searchString = req.query?.searchCriteria?.toString().trim() || '';

		const userId = req?.session?.account?.localAccountId;

		if (!userId) {
			throw new Error('userId required for searching documents');
		}

		const [filesDeleted] = readAndClearSessionData(req);

		let totalDocuments = 0;
		let documents: any[] = [];

		if (searchString) {
			const searchCriteria = createWhereClause(sanitiseSearchQuery(searchString), [
				{ fields: ['fileName'], searchType: 'contains' }
			]);

			const { pageSize, skipSize } = getPaginationParams(req);

			[totalDocuments, documents] = await db.$transaction([
				db.document.count({
					where: {
						...searchCriteria,
						deletedAt: null,
						caseId: id
					}
				}),
				db.document.findMany({
					include: {
						Folder: true,
						Case: true,
						UserDocuments: {
							where: {
								User: {
									idpUserId: userId
								}
							}
						}
					},
					where: {
						...searchCriteria,
						deletedAt: null,
						caseId: id
					},
					orderBy: { uploadedDate: 'desc' },
					skip: skipSize,
					take: pageSize
				})
			]);
		}

		const { selectedItemsPerPage, pageNumber, pageSize } = getPaginationParams(req);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalDocuments,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

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

		const documentsViewModel =
			documents.length > 0 ? createDocumentsViewModel(documents, documents[0].Case, PREVIEW_MIME_TYPES) : [];

		const returnUrl = req.baseUrl.replace(/\/search-results\/?$/, '');

		const breadcrumbItems = [
			{
				text: 'Manage case files',
				href: returnUrl
			},
			{
				text: 'Search results'
			}
		];

		return res.render('views/cases/case-folders/search-files/view.njk', {
			pageHeading: 'Search results',
			documents: documentsViewModel,
			// We keep backlink url even though we have breadcrumbs, as it is used for the "clear" button too.
			backLinkUrl: returnUrl,
			currentUrl: req.baseUrl,
			searchValue: searchString,
			paginationParams,
			breadcrumbItems,
			filesDeleted
		});
	};
}

/**
 * Reads session data for deleting files, then clears from session to avoid it showing repeatedly
 */
function readAndClearSessionData(req: Request) {
	const { id } = req.params;

	const filesDeleted = readSessionData(req, id, 'filesDeleted', false, 'folder');

	clearSessionData(req, id, 'filesDeleted', 'folder');

	return [filesDeleted];
}
