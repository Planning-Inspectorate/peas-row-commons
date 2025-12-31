import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { CaseListFields, CaseListViewModel, CurrentFilters } from './types.ts';
import { getPageData, getPaginationParams } from '../../pagination/pagination-utils.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { FilterGenerator, type FilterViewModel } from '@pins/peas-row-commons-lib/util/filter-generator.ts';
import { createWhereClause, splitStringQueries } from '@pins/peas-row-commons-lib/util/search-queries.ts';
import { CASE_TYPES } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import type { PrismaClient, Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';

import { formatInTimeZone } from 'date-fns-tz';
import type { Request } from 'express';

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

		const filterGenerator = new FilterGeneratorClass({
			keys: FILTER_KEYS,
			labels: FILTER_LABELS
		});

		const currentFiltersString = getCurrentFiltersAndGenerateString(filterGenerator, req);

		const searchString = req.query?.searchCriteria?.toString() || '';

		const whereClause = createCombinedWhereClause(req, filterGenerator, searchString);

		const query = generateQuery(db, skipSize, pageSize, whereClause);

		let cases, totalCases, typeCountsGrouped, subTypeCountsGrouped;

		try {
			[cases, totalCases, typeCountsGrouped, subTypeCountsGrouped] = await Promise.all(query);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching cases',
				logParams: {}
			});
		}

		if (Number.isNaN(totalCases) || !cases || !typeCountsGrouped || !subTypeCountsGrouped) {
			return notFoundHandler(req, res);
		}

		const countMap: Record<string, number> = formatCountData(typeCountsGrouped, subTypeCountsGrouped);

		const filters: FilterViewModel = filterGenerator.generateFilters(req.query, req.baseUrl, countMap);

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
			totalCases,
			filtersValue: currentFiltersString
		};

		return res.render('views/cases/list/view.njk', {
			pageHeading: 'Case list',
			currentPage: 'all-cases',
			cases: caseViewModels,
			currentUrl: req.originalUrl,
			paginationParams,
			filters,
			searchValue: searchString
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

type TypeGroup = Pick<Prisma.CaseGroupByOutputType, 'typeId'> & {
	_count: { _all: number };
};

type SubTypeGroup = Pick<Prisma.CaseGroupByOutputType, 'subTypeId'> & {
	_count: { _all: number };
};

/**
 * Formats the type & subtype counts into the correct format for the filter
 * generator, also formats casework area counts based on the data from 'type'.
 */
export function formatCountData(typeCountsGrouped: TypeGroup[], subTypeCountsGrouped: SubTypeGroup[]) {
	const countMap: Record<string, number> = {};

	for (const caseRow of typeCountsGrouped) {
		countMap[caseRow.typeId] = caseRow._count._all;
	}

	for (const caseRow of subTypeCountsGrouped) {
		if (!caseRow.subTypeId) continue;
		countMap[caseRow.subTypeId] = caseRow._count._all;
	}

	// Case work area is not stored on case model like type and subtype so we
	// aggregate through type's caseworkAreaId value
	for (const caseType of CASE_TYPES) {
		const typeCount = countMap[caseType.id] || 0;
		if (typeCount > 0) {
			const areaId = caseType.caseworkAreaId;
			countMap[areaId] = (countMap[areaId] || 0) + typeCount;
		}
	}

	return countMap;
}

/**
 * Creates a where clause for filter options and search criteria
 */
function createCombinedWhereClause(req: Request, filterGenerator: FilterGenerator, searchString: string) {
	const typeFilterWhereClause = filterGenerator.createFilterWhereClause(req.query);

	const searchCriteria = createWhereClause(splitStringQueries(searchString), [
		{ fields: ['reference', 'name'], searchType: 'contains' },
		{
			parent: 'Applicant',
			fields: ['name'],
			searchType: 'contains'
		},
		{
			parent: 'Status',
			fields: ['displayName'],
			searchType: 'contains'
		},
		{
			parent: 'Authority',
			fields: ['name'],
			searchType: 'contains'
		}
	]);

	return {
		...searchCriteria,
		...typeFilterWhereClause
	};
}

/**
 * Creates the query we will use to get the Case data
 */
function generateQuery(db: PrismaClient, skipSize: number, pageSize: number, whereClause: Record<string, any>) {
	return [
		db.case.findMany({
			orderBy: { receivedDate: 'desc' },
			include: {
				Type: { select: { displayName: true } },
				SubType: { select: { displayName: true } },
				Status: { select: { displayName: true } }
			},
			skip: skipSize,
			take: pageSize,
			where: whereClause
		}),
		db.case.count({
			where: whereClause
		}),
		db.case.groupBy({
			by: ['typeId'],
			_count: { _all: true }
		}),
		db.case.groupBy({
			by: ['subTypeId'],
			_count: { _all: true }
		})
	] as const;
}

/**
 * Checks params for just current filters and turns them back into a string.
 *
 * Needed for maintaining filters across pagination.
 */
export function getCurrentFiltersAndGenerateString(filterGenerator: FilterGenerator, req: Request) {
	const [area, type, subType] = filterGenerator.getAllSelectedValues(req.query);

	const currentFilters = {
		area,
		type,
		subType
	};

	const filtersValue = createFilterValuesString(currentFilters);

	return filtersValue;
}

/**
 * Given an object of currently selected filters, turn them into a
 * query string.
 */
export function createFilterValuesString(currentFilters: CurrentFilters) {
	let string = '';

	for (const [key, value] of Object.entries(currentFilters)) {
		value.forEach((item) => {
			string += `&${key}=${item}`;
		});
	}

	return string;
}
