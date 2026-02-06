import type { ManageService } from '#service';
import { createWhereClause, splitStringQueries } from '@pins/peas-row-commons-lib/util/search-queries.ts';
import type { RequestHandler } from 'express';
import { createDocumentsViewModel } from '../case-folder/view-model.ts';
import { PREVIEW_MIME_TYPES } from '../../upload/constants.ts';
import { getPageData, getPaginationParams } from '../../../pagination/pagination-utils.ts';
import { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';

/**
 * Controller for viewing the file search page, handles the pagination and select of the files.
 */
export function buildFileSearchView(service: ManageService): RequestHandler {
	const { db } = service;

	return async (req, res) => {
		const searchString = req.query?.searchCriteria?.toString() || '';
		const searchCriteria = createWhereClause(splitStringQueries(searchString), [
			{ fields: ['fileName'], searchType: 'contains' }
		]);

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		const [totalDocuments, documents] = await db.$transaction([
			db.document.count({
				where: {
					...searchCriteria,
					deletedAt: null
				}
			}),
			db.document.findMany({
				where: {
					...searchCriteria,
					deletedAt: null
				},
				skip: skipSize,
				take: pageSize
			})
		]);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalDocuments || 0,
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

		const documentsViewModel = documents ? createDocumentsViewModel(documents, PREVIEW_MIME_TYPES) : [];

		const returnUrl = req.baseUrl.replace(/\/search-results\/?$/, '');

		return res.render('views/cases/case-folders/search-files/view.njk', {
			pageHeading: 'Search results',
			documents: documentsViewModel,
			backLinkUrl: returnUrl,
			currentUrl: req.baseUrl,
			searchValue: searchString,
			paginationParams
		});
	};
}
