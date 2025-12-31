import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildListCases,
	caseToViewModel,
	createFilterValuesString,
	formatCountData,
	getCurrentFiltersAndGenerateString
} from './controller.ts';
import { configureNunjucks } from '../../../nunjucks.ts';
import { mockLogger } from '@pins/peas-row-commons-lib/testing/mock-logger.ts';

import {
	CASEWORK_AREAS_ID,
	CASE_TYPES_ID,
	CASE_SUBTYPES_ID
} from '@pins/peas-row-commons-database/src/seed/static_data/ids/index.ts';

const PAGINATION_TEST_CASES = [
	{
		name: 'should generate 1 page for 25 total items requested from page 1',
		totalItems: 25,
		itemsPerPage: 25,
		requestedPage: 1,
		expected: { totalPages: 1, resultsStartNumber: 1, resultsEndNumber: 25 }
	},
	{
		name: 'should generate 2 pages and return the first 25 items for 50 total items requested from page 1',
		totalItems: 50,
		itemsPerPage: 25,
		requestedPage: 1,
		expected: { totalPages: 2, resultsStartNumber: 1, resultsEndNumber: 25 }
	},
	{
		name: 'should generate 2 pages and return the last 25 items for 50 total items requested from page 2',
		totalItems: 50,
		itemsPerPage: 25,
		requestedPage: 2,
		expected: { totalPages: 2, resultsStartNumber: 26, resultsEndNumber: 50 }
	},
	{
		name: 'should generate 3 pages and return the 2nd set of 25 items for 60 total items requested from page 2',
		totalItems: 60,
		itemsPerPage: 25,
		requestedPage: 2,
		expected: { totalPages: 3, resultsStartNumber: 26, resultsEndNumber: 50 }
	},
	{
		name: 'should generate 3 pages and return the final 10 items for 60 total items requested from page 3 (partial page)',
		totalItems: 60,
		itemsPerPage: 25,
		requestedPage: 3,
		expected: { totalPages: 3, resultsStartNumber: 51, resultsEndNumber: 60 }
	},
	{
		name: 'should generate 4 pages and return the 3rd set of 25 items for 100 total items requested from page 3',
		totalItems: 100,
		itemsPerPage: 25,
		requestedPage: 3,
		expected: { totalPages: 4, resultsStartNumber: 51, resultsEndNumber: 75 }
	},
	{
		name: 'should generate 4 pages and return the last 25 items for 100 total items requested from page 4',
		totalItems: 100,
		itemsPerPage: 25,
		requestedPage: 4,
		expected: { totalPages: 4, resultsStartNumber: 76, resultsEndNumber: 100 }
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
			}
		});
	}
	return cases;
};

describe('Case Controller', () => {
	class MockFilterGenerator {
		constructor(options: any) {}
		generateFilters() {
			return [];
		}
		createFilterWhereClause() {
			return {};
		}
		getAllSelectedValues() {
			return [[], [], []];
		}
	}

	describe('caseToViewModel', () => {
		it('should format receivedDate and create a sortable timestamp', () => {
			const input = {
				id: '123',
				reference: 'ROW/001',
				receivedDate: new Date('2024-01-15T12:00:00.000Z'),
				Type: { displayName: 'Rights of Way' }
			};

			const result = caseToViewModel(input as any);

			assert.strictEqual(result.id, '123');
			assert.strictEqual(result.Type.displayName, 'Rights of Way');
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
				originalUrl: '/cases'
			};

			const mockDb = {
				case: {
					// Added _args: any so TS knows this function accepts arguments
					findMany: mock.fn((_args: any) => [
						{
							id: '1',
							reference: 'A',
							receivedDate: new Date('2024-01-01'),
							Type: { displayName: 'Type A' }
						},
						{
							id: '2',
							reference: 'B',
							receivedDate: new Date('2024-02-01'),
							Type: { displayName: 'Type B' }
						}
					]),
					count: mock.fn(() => 2),
					groupBy: mock.fn(() => {
						return [];
					})
				}
			};

			const listCases = buildListCases({ db: mockDb, logger: mockLogger() } as any, MockFilterGenerator as any);

			await assert.doesNotReject(() => listCases(mockReq as any, mockRes as any));

			assert.strictEqual(mockDb.case.findMany.mock.callCount(), 1);

			const dbArgs = mockDb.case.findMany.mock.calls[0].arguments[0];

			assert.deepStrictEqual(dbArgs.orderBy, { receivedDate: 'desc' });
			assert.strictEqual(dbArgs.take, 25);
			assert.deepStrictEqual(dbArgs.include, {
				Type: { select: { displayName: true } },
				SubType: { select: { displayName: true } },
				Status: { select: { displayName: true } }
			});

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const renderArgs = mockRes.render.mock.calls[0].arguments;

			assert.strictEqual(renderArgs[0], 'views/cases/list/view.njk');
			assert.strictEqual(renderArgs[1].pageHeading, 'Case list');
			assert.strictEqual(renderArgs[1].cases.length, 2);
			assert.strictEqual(renderArgs[1].cases[0].receivedDate, '01 Jan 2024');
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
					originalUrl: '/cases'
				};
				const mockDb = {
					case: {
						findMany: mock.fn(() => createMockCases(expected.resultsEndNumber - expected.resultsStartNumber + 1)),
						count: mock.fn(() => totalItems),
						groupBy: mock.fn(() => {
							return [];
						})
					}
				};

				const listCases = buildListCases({ db: mockDb, logger: mockLogger() } as any, MockFilterGenerator as any);
				await assert.doesNotReject(() => listCases(mockReq as any, mockRes as any));

				assert.strictEqual(mockRes.render.mock.callCount(), 1);

				const onlyRelevantKeys = {
					...mockRes.render.mock.calls[0].arguments[1]
				};
				delete onlyRelevantKeys.cases;
				delete onlyRelevantKeys.filters;

				assert.deepStrictEqual(onlyRelevantKeys, {
					currentPage: 'all-cases',
					pageHeading: 'Case list',
					currentUrl: '/cases',
					searchValue: '',
					paginationParams: {
						pageNumber: requestedPage,
						resultsEndNumber: expected.resultsEndNumber,
						resultsStartNumber: expected.resultsStartNumber,
						selectedItemsPerPage: itemsPerPage,
						totalCases: totalItems,
						totalPages: expected.totalPages,
						filtersValue: ''
					}
				});
			});
		});
	});
	describe('formatCountData (Aggregation Logic)', () => {
		it('should correctly map Types and SubTypes to their counts', () => {
			const typeCounts = [{ typeId: CASE_TYPES_ID.DROUGHT, _count: { _all: 5 } }];
			const subTypeCounts = [{ subTypeId: CASE_SUBTYPES_ID.NEW_LINES, _count: { _all: 3 } }];

			const result = formatCountData(typeCounts as any, subTypeCounts as any);

			assert.strictEqual(result[CASE_TYPES_ID.DROUGHT], 5);
			assert.strictEqual(result[CASE_SUBTYPES_ID.NEW_LINES], 3);
		});

		it('should correctly aggregate counts for Casework Areas based on Type parentage', () => {
			const typeCounts = [
				{ typeId: CASE_TYPES_ID.COMMON_LAND, _count: { _all: 10 } },
				{ typeId: CASE_TYPES_ID.RIGHTS_OF_WAY, _count: { _all: 20 } },
				{ typeId: CASE_TYPES_ID.DROUGHT, _count: { _all: 5 } }
			];

			const result = formatCountData(typeCounts as any, []);

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

			const result = formatCountData(typeCounts as any, subTypeCounts as any);

			assert.strictEqual(result[CASE_TYPES_ID.HOUSING_PLANNING_CPOS], 100);

			assert.strictEqual(result[CASEWORK_AREAS_ID.PLANNING_ENVIRONMENTAL_APPLICATIONS], 100);

			assert.strictEqual(result[CASE_SUBTYPES_ID.COMMONS_ECCLESIASTICAL], 7);
		});

		it('should return empty object if no counts provided', () => {
			const result = formatCountData([], []);
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
					query: { area: 'North', type: 'Commercial' }
				};

				const mockGenerator = {
					getAllSelectedValues: mock.fn((query) => {
						return [['North'], ['Commercial'], ['Specific Sub']];
					})
				};

				const result = getCurrentFiltersAndGenerateString(mockGenerator as any, mockReq as any);

				assert.strictEqual(mockGenerator.getAllSelectedValues.mock.callCount(), 1);
				assert.deepStrictEqual(mockGenerator.getAllSelectedValues.mock.calls[0].arguments[0], mockReq.query);

				assert.strictEqual(result, '&area=North&type=Commercial&subType=Specific Sub');
			});

			it('should handle cases where generator returns empty arrays', () => {
				const mockReq = { query: {} };

				const mockGenerator = {
					getAllSelectedValues: mock.fn(() => [[], [], []])
				};

				const result = getCurrentFiltersAndGenerateString(mockGenerator as any, mockReq as any);

				assert.strictEqual(result, '');
			});
		});
	});
});
