import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { CaseListFields, CaseListViewModel, CurrentFilters } from './types.ts';
import { getPageData, getPaginationParams } from '../../pagination/pagination-utils.ts';
import { wrapPrismaError } from '@pins/peas-row-commons-lib/util/database.ts';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { FilterGenerator, type FilterViewModel } from '@pins/peas-row-commons-lib/util/filter-generator.ts';
import { createWhereClause, sanitiseSearchQuery } from '@pins/peas-row-commons-lib/util/search-queries.ts';
import { CASE_TYPES } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import type { PrismaClient, Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';

import { formatInTimeZone } from 'date-fns-tz';
import type { Request } from 'express';
import { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/contact-type.ts';

const FILTER_KEYS = {
	AREA: 'area',
	TYPE: 'type',
	SUBTYPE: 'subType',
	STATUS: 'status'
};

const FILTER_LABELS = {
	AREA_SUFFIX: 'case work area',
	TYPE_SUFFIX: 'case type',
	SUBTYPE_SUFFIX: 'subtype',
	STATUS_SUFFIX: 'status'
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

		let cases, totalCases, typeCountsGrouped, subTypeCountsGrouped, statusCountsGrouped;

		try {
			[cases, totalCases, typeCountsGrouped, subTypeCountsGrouped, statusCountsGrouped] = await Promise.all(query);
		} catch (error: any) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching cases',
				logParams: {}
			});
		}

		if (Number.isNaN(totalCases) || !cases || !typeCountsGrouped || !subTypeCountsGrouped || !statusCountsGrouped) {
			return notFoundHandler(req, res);
		}

		const countMap: Record<string, number> = formatCountData(
			typeCountsGrouped,
			subTypeCountsGrouped,
			statusCountsGrouped
		);

		const currentPath = req.originalUrl.split('?')[0];

		const filters: FilterViewModel = filterGenerator.generateFilters(req.query, currentPath, countMap);

		const caseViewModels = cases.map(caseToViewModel);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalCases || 0,
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
			totalCases,
			filtersValue: currentFiltersString,
			uiItems: paginationItems
		};

		return res.render('views/cases/list/view.njk', {
			pageHeading: 'Case list',
			currentPage: 'all-cases',
			cases: caseViewModels,
			currentUrl: req.originalUrl,
			currentPath,
			paginationParams,
			filters,
			searchValue: searchString
		});
	};
}

export function caseToViewModel(caseRow: CaseListFields): CaseListViewModel {
	return {
		...caseRow,
		Status: caseRow.Status || { displayName: null },
		receivedDate: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime()
	};
}

type TypeGroup = Pick<Prisma.CaseGroupByOutputType, 'typeId'> & {
	_count: { _all: number };
};

type SubTypeGroup = Pick<Prisma.CaseGroupByOutputType, 'subTypeId'> & {
	_count: { _all: number };
};

type StatusGroup = Pick<Prisma.CaseGroupByOutputType, 'statusId'> & {
	_count: { _all: number };
};

/**
 * Formats the type, subtype, and status counts into the correct format for the filter
 * generator, also formats casework area counts based on the data from 'type'.
 */
export function formatCountData(
	typeCountsGrouped: TypeGroup[],
	subTypeCountsGrouped: SubTypeGroup[],
	statusCountsGrouped: StatusGroup[]
) {
	const countMap: Record<string, number> = {};

	for (const caseRow of typeCountsGrouped) {
		countMap[caseRow.typeId] = caseRow._count._all;
	}

	for (const caseRow of subTypeCountsGrouped) {
		if (!caseRow.subTypeId) continue;
		countMap[caseRow.subTypeId] = caseRow._count._all;
	}

	for (const caseRow of statusCountsGrouped) {
		if (!caseRow.statusId) continue;
		countMap[caseRow.statusId] = caseRow._count._all;
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

	const searchCriteria = createWhereClause(sanitiseSearchQuery(searchString), [
		{ fields: ['reference', 'name', 'historicalReference'], searchType: 'contains' },
		{
			parent: 'Contacts',
			isList: true,
			fields: ['firstName', 'lastName', 'orgName'],
			searchType: 'startsWith',
			relationConstraints: [
				{ contactTypeId: CONTACT_TYPE_ID.APPLICANT_APPELLANT } // Only check applicants
			]
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
		/**
		 * Counts for each filter are currently not adjusted by the where clause.
		 * They always show the total number of cases.
		 */
		db.case.groupBy({
			by: ['typeId'],
			_count: { _all: true }
		}),
		db.case.groupBy({
			by: ['subTypeId'],
			_count: { _all: true }
		}),
		db.case.groupBy({
			by: ['statusId'],
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
	const [area, type, subType, status] = filterGenerator.getAllSelectedValues(req.query);

	const currentFilters = {
		area,
		type,
		subType,
		status
	};

	return createFilterValuesString(currentFilters);
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
