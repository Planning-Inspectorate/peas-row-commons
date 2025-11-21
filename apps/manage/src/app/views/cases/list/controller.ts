import { formatInTimeZone } from 'date-fns-tz';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { CaseListFields, CaseListViewModel } from './types.ts';
import { getPageData, getPaginationParams } from '../../pagination/pagination-utils.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { FilterGenerator, type FilterViewModel } from '@pins/peas-row-commons-lib/util/filter-generator.ts';

const FILTER_KEYS = {
	AREA: 'area',
	TYPE: 'type',
	SUBTYPE: 'subtype'
};

const FILTER_LABELS = {
	AREA_SUFFIX: 'case work area',
	TYPE_SUFFIX: 'case type',
	SUBTYPE_SUFFIX: 'subtype'
};

export function buildListCases(service: ManageService, FilterGeneratorClass = FilterGenerator): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list cases');

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		const baseUrl = req.baseUrl;

		const filterGenerator = new FilterGeneratorClass({
			keys: FILTER_KEYS,
			labels: FILTER_LABELS
		});

		const filters: FilterViewModel = filterGenerator.generateFilters(req.query, baseUrl);

		const typeFilterWhereClause = filterGenerator.createFilterWhereClause(req.query);

		let cases, totalCases;

		try {
			[cases, totalCases] = await Promise.all([
				db.case.findMany({
					orderBy: { receivedDate: 'desc' },
					include: {
						Type: {
							select: {
								displayName: true
							}
						}
					},
					skip: skipSize,
					take: pageSize,
					where: typeFilterWhereClause
				}),
				db.case.count({
					where: typeFilterWhereClause
				})
			]);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching cases',
				logParams: {}
			});
		}

		if (Number.isNaN(totalCases) || !cases) {
			return notFoundHandler(req, res);
		}

		const caseViewModels = cases.map(caseToViewModel);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalCases || 0,
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
			totalCases
		};

		return res.render('views/cases/list/view.njk', {
			pageHeading: 'Case list',
			currentPage: 'all-cases',
			cases: caseViewModels,
			currentUrl: req.originalUrl,
			paginationParams,
			filters
		});
	};
}

export function caseToViewModel(caseRow: CaseListFields): CaseListViewModel {
	const viewModel = {
		...caseRow,
		receivedDate: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime()
	};
	return viewModel;
}
