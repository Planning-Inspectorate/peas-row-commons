import type { ManageService } from '#service';
import type { FilterViewModel } from '@pins/peas-row-commons-lib/util/filter-generator.ts';
import type { getPaginationModel } from '@pins/peas-row-commons-lib/util/pagination.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';
import type { Request, Response } from 'express';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import type { ParsedQs } from 'qs';
import { configureNunjucks } from '../../../nunjucks.ts';
import {
	buildListCases,
	caseToViewModel,
	createFilterValuesString,
	formatCountData,
	getCurrentFiltersAndGenerateString
} from './controller.ts';

import {
	CASEWORK_AREAS_ID,
	CASE_SUBTYPES_ID,
	CASE_TYPES_ID
} from '@pins/peas-row-commons-database/src/seed/static-data/ids/index.ts';
import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/status.ts';
import type { CaseListViewModel } from './types.ts';

const PAGINATION_TEST_CASES = [
	{
		name: 'should generate 1 page for 25 total items requested from page 1',
		totalItems: 25,
		itemsPerPage: 25,
		requestedPage: 1,
		expected: {
			totalPages: 1,
			resultsStartNumber: 1,
			resultsEndNumber: 25,
			hasNext: false,
			hasPrev: false,
			itemCount: 0
		} // 0 items because GovUK pagination hides the list if there is only 1 page
	},
	{
		name: 'should generate 2 pages and return the first 25 items for 50 total items requested from page 1',
		totalItems: 50,
		itemsPerPage: 25,
		requestedPage: 1,
		expected: {
			totalPages: 2,
			resultsStartNumber: 1,
			resultsEndNumber: 25,
			hasNext: true,
			hasPrev: false,
			itemCount: 2
		}
	},
	{
		name: 'should generate 2 pages and return the last 25 items for 50 total items requested from page 2',
		totalItems: 50,
		itemsPerPage: 25,
		requestedPage: 2,
		expected: {
			totalPages: 2,
			resultsStartNumber: 26,
			resultsEndNumber: 50,
			hasNext: false,
			hasPrev: true,
			itemCount: 2
		}
	},
	{
		name: 'should generate 3 pages and return the 2nd set of 25 items for 60 total items requested from page 2',
		totalItems: 60,
		itemsPerPage: 25,
		requestedPage: 2,
		expected: {
			totalPages: 3,
			resultsStartNumber: 26,
			resultsEndNumber: 50,
			hasNext: true,
			hasPrev: true,
			itemCount: 3
		}
	},
	{
		name: 'should generate 3 pages and return the final 10 items for 60 total items requested from page 3 (partial page)',
		totalItems: 60,
		itemsPerPage: 25,
		requestedPage: 3,
		expected: {
			totalPages: 3,
			resultsStartNumber: 51,
			resultsEndNumber: 60,
			hasNext: false,
			hasPrev: true,
			itemCount: 3
		}
	},
	{
		name: 'should generate 4 pages and return the 3rd set of 25 items for 100 total items requested from page 3',
		totalItems: 100,
		itemsPerPage: 25,
		requestedPage: 3,
		expected: {
			totalPages: 4,
			resultsStartNumber: 51,
			resultsEndNumber: 75,
			hasNext: true,
			hasPrev: true,
			itemCount: 4
		}
	},
	{
		name: 'should generate 4 pages and return the last 25 items for 100 total items requested from page 4',
		totalItems: 100,
		itemsPerPage: 25,
		requestedPage: 4,
		expected: {
			totalPages: 4,
			resultsStartNumber: 76,
			resultsEndNumber: 100,
			hasNext: false,
			hasPrev: true,
			itemCount: 4
		}
	}
];

const createMockCases = (count: number) => {
	const cases = [];
	for (let i = 1; i <= count; i++) {
		cases.push({
			id: `id-${i}`,
			reference: `CASE/${i}`,
			receivedDate: Date.now(),
			Type: {
				displayName: 'Test Type'
			},
			Status: {
				displayName: 'In progress'
			}
		});
	}
	return cases;
};

async function listCases(query: ParsedQs, totalCases = 100) {
	const db = {
		case: {
			findMany: mock.fn((_args: { where: Record<string, unknown> }) => createMockCases(totalCases ? 1 : 0)),
			count: mock.fn((_args: { where: Record<string, unknown> }) => totalCases),
			groupBy: mock.fn(() => [])
		}
	};
	const res = {
		render: mock.fn(
			(
				_view: string,
				_data: {
					cases: CaseListViewModel[];
					searchValue: string;
					clearSearchUrl: string;
					filters: FilterViewModel;
					paginationParams: { filtersValue: string; uiItems: ReturnType<typeof getPaginationModel> };
				}
			) => {}
		)
	};
	const handler = buildListCases({ db, logger: mockLogger() } as unknown as ManageService);
	await handler(
		{ query, originalUrl: '/cases?page=3', baseUrl: '', path: '/cases' } as Request,
		res as unknown as Response,
		() => {}
	);
	assert.strictEqual(res.render.mock.callCount(), 1);
	const [view, data] = res.render.mock.calls[0].arguments;
	assert.strictEqual(view, 'views/cases/list/view.njk');
	return { data, db };
}

describe('Cumulative case search and filters', () => {
	for (const hasSearch of [false, true]) {
		for (const hasFilters of [false, true]) {
			it(`should combine conditions with search=${hasSearch} and filters=${hasFilters}`, async () => {
				const query = {
					...(hasSearch ? { searchCriteria: 'Test phrase' } : {}),
					...(hasFilters ? { type: CASE_TYPES_ID.RIGHTS_OF_WAY, status: CASE_STATUS_ID.IN_PROGRESS } : {})
				};
				const { db } = await listCases(query);
				const where = db.case.findMany.mock.calls[0].arguments[0].where;
				assert.deepStrictEqual(where, db.case.count.mock.calls[0].arguments[0].where);
				assert.ok(Array.isArray(where.AND));
				assert.strictEqual(where.AND.length, (hasSearch ? 1 : 0) + (hasFilters ? 2 : 0));
				if (hasSearch) {
					assert.deepStrictEqual(where.AND[0].OR[0], {
						OR: ['reference', 'name', 'historicalReference'].map((field) => ({
							[field]: { contains: 'Test phrase' }
						}))
					});
				}
				if (hasFilters) {
					assert.deepStrictEqual(where.AND.slice(hasSearch ? 1 : 0), [
						{ OR: [{ typeId: { in: [CASE_TYPES_ID.RIGHTS_OF_WAY] } }] },
						{ statusId: { in: [CASE_STATUS_ID.IN_PROGRESS] } }
					]);
				}
			});
		}
	}

	it('should pass the search value and all selected filters to the template', async () => {
		const searchCriteria = 'footpath';
		const query = {
			area: [CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND, CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS],
			type: [CASE_TYPES_ID.RIGHTS_OF_WAY, CASE_TYPES_ID.COMMON_LAND],
			subType: [CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL, CASE_SUBTYPES_ID.OPPOSED_DMMO],
			status: CASE_STATUS_ID.IN_PROGRESS,
			searchCriteria,
			page: '3'
		};
		const { data } = await listCases(query);
		assert.strictEqual(data.searchValue, searchCriteria);
		const filterParams = new URLSearchParams(data.paginationParams.filtersValue);
		const clearParams = new URL(data.clearSearchUrl, 'https://example.test').searchParams;
		for (const key of ['area', 'type', 'subType', 'status'] as const) {
			const selectedValues = data.filters.checkboxGroups
				.flat()
				.filter((group) => group.name === key)
				.flatMap((group) => group.items.filter((item) => item.checked).map((item) => item.value));
			assert.deepStrictEqual(selectedValues.sort(), [query[key]].flat().sort());
			assert.deepStrictEqual(filterParams.getAll(key), [query[key]].flat());
			assert.deepStrictEqual(clearParams.getAll(key), [query[key]].flat());
		}
		assert.ok(!clearParams.has('searchCriteria'));
		assert.ok(!clearParams.has('page'));
		assert.ok(!filterParams.has('searchCriteria'));
		assert.ok(!filterParams.has('page'));

		const { items, previous, next } = data.paginationParams.uiItems;
		const paginationLinks = [...items, previous, next];
		assert.strictEqual(paginationLinks.length, 6);
		for (const link of paginationLinks) {
			assert.ok(link && 'href' in link);
			const params = new URL(link.href!, 'https://example.test').searchParams;
			assert.strictEqual(params.get('searchCriteria'), searchCriteria);
			for (const key of ['area', 'type', 'subType', 'status'] as const) {
				assert.deepStrictEqual(params.getAll(key), [query[key]].flat());
			}
		}
	});

	it('should pass search criteria with special characters unchanged to the template', async () => {
		const searchCriteria = 'A&B + "plot" = /?';
		const { data } = await listCases({ searchCriteria, status: CASE_STATUS_ID.IN_PROGRESS });
		assert.strictEqual(data.searchValue, searchCriteria);
	});

	it('should preserve special characters in search criteria across pagination links', async () => {
		const searchCriteria = 'A&B + "plot" = /?';
		const { data } = await listCases({
			searchCriteria,
			status: CASE_STATUS_ID.IN_PROGRESS,
			page: '3'
		});
		const { items, previous, next } = data.paginationParams.uiItems;
		const links = [...items, previous, next];
		assert.strictEqual(links.length, 6);
		for (const link of links) {
			assert.ok(link && 'href' in link);
			const params = new URL(link.href!, 'https://example.test').searchParams;
			assert.strictEqual(params.get('searchCriteria'), searchCriteria);
			assert.strictEqual(params.get('status'), CASE_STATUS_ID.IN_PROGRESS);
		}
	});

	it('should pass a clear search URL retaining filters when there are no results', async () => {
		const { data } = await listCases({ searchCriteria: 'will-not-be-found', status: CASE_STATUS_ID.IN_PROGRESS }, 0);
		assert.deepStrictEqual(data.cases, []);
		assert.strictEqual(data.searchValue, 'will-not-be-found');
		assert.strictEqual(data.clearSearchUrl, `/cases?status=${CASE_STATUS_ID.IN_PROGRESS}`);
	});

	it('should pass an empty search value and unfiltered clear search URL before searching', async () => {
		const { data } = await listCases({});
		assert.strictEqual(data.searchValue, '');
		assert.strictEqual(data.clearSearchUrl, '/cases');
	});

	it('should pass an empty search value and clear filters URL for filter-only no-results', async () => {
		const { data } = await listCases({ status: CASE_STATUS_ID.IN_PROGRESS }, 0);
		assert.deepStrictEqual(data.cases, []);
		assert.strictEqual(data.searchValue, '');
		assert.strictEqual(data.filters.selectedCategories.clearLinkHref, '/cases');
	});
});

describe('Case Controller', () => {
	class MockFilterGenerator {
		constructor(_options: any) {}

		generateFilters(_query: any, path: string, _countMap: any) {
			return {
				checkboxGroups: [],
				selectedCategories: {
					categories: [],
					clearLinkHref: path
				}
			};
		}

		createFilterWhereClause() {
			return {};
		}

		getAllSelectedValues() {
			return [[], [], [], []];
		}
	}

	describe('caseToViewModel', () => {
		it('should format receivedDate and create a sortable timestamp', () => {
			const input = {
				id: '123',
				reference: 'ROW/001',
				receivedDate: new Date('2024-01-15T12:00:00.000Z'),
				Type: { displayName: 'Rights of Way' },
				Status: { displayName: 'In progress' }
			};

			const result = caseToViewModel(input as any);

			assert.strictEqual(result.id, '123');
			assert.strictEqual(result.Type.displayName, 'Rights of Way');
			assert.strictEqual(result.Status.displayName, 'In progress');
			assert.strictEqual(result.receivedDate, '15 Jan 2024');
			assert.strictEqual(result.receivedDateSortable, input.receivedDate.getTime());
		});
	});

	describe('buildListCases', () => {
		it('should fetch cases, map them, and render the view', async () => {
			const nunjucks = configureNunjucks();

			const mockRes = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};

			const mockReq = {
				query: {},
				originalUrl: '/cases',
				baseUrl: 'https://localhost:4000',
				path: '/cases'
			};

			const mockDb = {
				case: {
					findMany: mock.fn(() => [
						{
							id: '1',
							reference: 'A',
							receivedDate: new Date('2024-01-01'),
							Type: { displayName: 'Type A' },
							Status: { displayName: 'In progress' }
						},
						{
							id: '2',
							reference: 'B',
							receivedDate: new Date('2024-02-01'),
							Type: { displayName: 'Type B' },
							Status: { displayName: 'Closed' }
						}
					]),
					count: mock.fn(() => 2),
					groupBy: mock.fn(() => [])
				}
			};

			const listCases = buildListCases({ db: mockDb, logger: mockLogger() } as any);

			await listCases(mockReq as any, mockRes as any);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments;
			assert.strictEqual(renderArgs[0], 'views/cases/list/view.njk');
			assert.strictEqual(renderArgs[1].pageHeading, 'Case list');
			assert.strictEqual(renderArgs[1].cases.length, 2);
			assert.strictEqual(renderArgs[1].cases[0].receivedDate, '01 Jan 2024');
			assert.strictEqual(renderArgs[1].cases[0].Status.displayName, 'In progress');
			const groups = renderArgs[1].filters.checkboxGroups.flat();
			const statusGroup = groups.find((g: { idPrefix: string }) => g.idPrefix === 'status-root');
			assert.ok(statusGroup, 'Status group should exist');

			assert.ok(renderArgs[1].paginationParams, 'Pagination Params object should be passed to view');
		});

		it('should strip query parameters from currentPath but preserve them in currentUrl', async () => {
			const nunjucks = configureNunjucks();

			const mockRes = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};

			const mockReq = {
				originalUrl: '/cases?page=2&area=planning&search=test',
				baseUrl: 'https://localhost:4000',
				path: '/cases',
				query: {
					page: '2',
					area: 'planning',
					search: 'test'
				}
			};

			const mockDb = {
				case: {
					findMany: mock.fn(() => [
						{
							id: '1',
							reference: 'TEST/001',
							receivedDate: new Date('2024-01-01'),
							Type: { displayName: 'Planning' },
							Status: { displayName: 'Open' }
						}
					]),
					count: mock.fn(() => 1),
					groupBy: mock.fn(() => [])
				}
			};

			const listCases = buildListCases({ db: mockDb, logger: mockLogger() } as any, MockFilterGenerator as any);

			await listCases(mockReq as any, mockRes as any);

			const renderData = mockRes.render.mock.calls[0].arguments[1];

			assert.strictEqual(renderData.currentPath, '/cases');
			assert.strictEqual(renderData.currentUrl, '/cases?page=2&area=planning&search=test');
		});
	});

	describe('Pagination permutations', () => {
		const nunjucks = configureNunjucks();

		PAGINATION_TEST_CASES.forEach(({ name, totalItems, itemsPerPage, requestedPage, expected }) => {
			it(name, async () => {
				const mockRes = {
					render: mock.fn((view, data) => nunjucks.render(view, data))
				};
				const mockReq = {
					query: {
						itemsPerPage: itemsPerPage,
						page: requestedPage
					},
					originalUrl: '/cases',
					baseUrl: 'https://localhost:4000',
					path: '/cases'
				};
				const mockDb = {
					case: {
						findMany: mock.fn(() => createMockCases(expected.resultsEndNumber - expected.resultsStartNumber + 1)),
						count: mock.fn(() => totalItems),
						groupBy: mock.fn(() => [])
					}
				};

				const listCases = buildListCases({ db: mockDb, logger: mockLogger() } as any);
				await assert.doesNotReject(() => listCases(mockReq as any, mockRes as any));

				assert.strictEqual(mockRes.render.mock.callCount(), 1);

				const renderData = mockRes.render.mock.calls[0].arguments[1];
				const params = renderData.paginationParams;

				const { uiItems: nestedUiItems, ...cleanPaginationParams } = params;

				assert.deepStrictEqual(cleanPaginationParams, {
					pageNumber: requestedPage,
					resultsEndNumber: expected.resultsEndNumber,
					resultsStartNumber: expected.resultsStartNumber,
					selectedItemsPerPage: itemsPerPage,
					totalCases: totalItems,
					totalPages: expected.totalPages,
					filtersValue: ''
				});

				const uiPagination = nestedUiItems;

				assert.ok(uiPagination, 'UI Pagination object is missing from render data');

				if (expected.totalPages > 1) {
					assert.strictEqual(uiPagination.items.length, expected.itemCount, 'Incorrect number of page links generated');

					if (expected.hasNext) {
						assert.ok(uiPagination.next, 'Should have a Next link');
						assert.ok(uiPagination.next.href.includes(`page=${requestedPage + 1}`));
					} else {
						assert.strictEqual(uiPagination.next, null, 'Should NOT have a Next link');
					}

					if (expected.hasPrev) {
						assert.ok(uiPagination.previous, 'Should have a Previous link');
						assert.ok(uiPagination.previous.href.includes(`page=${requestedPage - 1}`));
					} else {
						assert.strictEqual(uiPagination.previous, null, 'Should NOT have a Previous link');
					}
				} else {
					assert.strictEqual(uiPagination.items.length, 0);
					assert.strictEqual(uiPagination.next, null);
					assert.strictEqual(uiPagination.previous, null);
				}
			});
		});
	});
	describe('formatCountData (Aggregation Logic)', () => {
		it('should correctly map Types and SubTypes to their counts', () => {
			const typeCounts = [{ typeId: CASE_TYPES_ID.DROUGHT, _count: { _all: 5 } }];
			const subTypeCounts = [{ subTypeId: CASE_SUBTYPES_ID.NEW_LINES, _count: { _all: 3 } }];
			const statusCounts = [{ statusId: CASE_STATUS_ID.IN_PROGRESS, _count: { _all: 2 } }];

			const result = formatCountData(typeCounts as any, subTypeCounts as any, statusCounts as any);

			assert.strictEqual(result[CASE_TYPES_ID.DROUGHT], 5);
			assert.strictEqual(result[CASE_SUBTYPES_ID.NEW_LINES], 3);
			assert.strictEqual(result[CASE_STATUS_ID.IN_PROGRESS], 2);
		});

		it('should correctly aggregate counts for Casework Areas based on Type parentage', () => {
			const typeCounts = [
				{ typeId: CASE_TYPES_ID.COMMON_LAND, _count: { _all: 10 } },
				{ typeId: CASE_TYPES_ID.RIGHTS_OF_WAY, _count: { _all: 20 } },
				{ typeId: CASE_TYPES_ID.DROUGHT, _count: { _all: 5 } }
			];

			const result = formatCountData(typeCounts as any, [], []);

			assert.strictEqual(result[CASE_TYPES_ID.COMMON_LAND], 10);
			assert.strictEqual(result[CASE_TYPES_ID.RIGHTS_OF_WAY], 20);
			assert.strictEqual(result[CASE_TYPES_ID.DROUGHT], 5);

			assert.strictEqual(
				result[CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND],
				30,
				'Should sum Common Land and RoW counts into the parent Area'
			);

			assert.strictEqual(
				result[CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS],
				5,
				'Should map Drought count to the parent Area'
			);
		});

		it('should handle mixed Type and Subtype counts simultaneously', () => {
			const typeCounts = [{ typeId: CASE_TYPES_ID.HOUSING_PLANNING_CPOS, _count: { _all: 100 } }];
			const subTypeCounts = [{ subTypeId: CASE_SUBTYPES_ID.COMMONS_ECCLESIASTICAL, _count: { _all: 7 } }];

			const result = formatCountData(typeCounts as any, subTypeCounts as any, []);

			assert.strictEqual(result[CASE_TYPES_ID.HOUSING_PLANNING_CPOS], 100);

			assert.strictEqual(result[CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS], 100);

			assert.strictEqual(result[CASE_SUBTYPES_ID.COMMONS_ECCLESIASTICAL], 7);
		});

		it('should return empty object if no counts provided', () => {
			const result = formatCountData([], [], []);
			assert.deepStrictEqual(result, {});
		});
	});

	describe('Filter Helper Functions', () => {
		describe('createFilterValuesString', () => {
			it('should convert an object of array values into a query string', () => {
				const input = {
					area: ['North', 'South'],
					type: ['Commercial'],
					subType: []
				};

				const result = createFilterValuesString(input as any);

				assert.strictEqual(result, '&area=North&area=South&type=Commercial');
			});

			it('should return an empty string if all arrays are empty', () => {
				const input = {
					area: [],
					type: [],
					subType: []
				};

				const result = createFilterValuesString(input as any);

				assert.strictEqual(result, '');
			});
		});

		describe('getCurrentFiltersAndGenerateString', () => {
			it('should extract values using the generator and return formatted string', () => {
				const mockReq = {
					query: { area: 'North', type: 'Commercial', status: CASE_STATUS_ID.IN_PROGRESS },
					baseUrl: 'https://localhost:4000'
				};

				const mockGenerator = {
					getAllSelectedValues: mock.fn((_query) => {
						return [['North'], ['Commercial'], ['Specific Sub'], [CASE_STATUS_ID.IN_PROGRESS]];
					})
				};

				const result = getCurrentFiltersAndGenerateString(mockGenerator as any, mockReq as any);

				assert.strictEqual(mockGenerator.getAllSelectedValues.mock.callCount(), 1);
				assert.deepStrictEqual(mockGenerator.getAllSelectedValues.mock.calls[0].arguments[0], mockReq.query);

				assert.strictEqual(
					result,
					'&area=North&type=Commercial&subType=Specific+Sub&status=' + CASE_STATUS_ID.IN_PROGRESS
				);
			});

			it('should handle cases where generator returns empty arrays', () => {
				const mockReq = { query: {}, baseUrl: 'https://localhost:4000' };

				const mockGenerator = {
					getAllSelectedValues: mock.fn(() => [[], [], [], []])
				};

				const result = getCurrentFiltersAndGenerateString(mockGenerator as any, mockReq as any);

				assert.strictEqual(result, '');
			});
		});
	});
});
