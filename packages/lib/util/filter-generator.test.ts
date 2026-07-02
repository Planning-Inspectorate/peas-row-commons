import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	CASEWORK_AREAS_ID,
	CASE_TYPES_ID,
	CASE_SUBTYPES_ID
} from '@pins/peas-row-commons-database/src/seed/static-data/ids/index.ts';
import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/status.ts';
import { CASE_STATUSES } from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import { FilterGenerator } from './filter-generator.ts';

// Type helper for accessing OR conditions in test assertions
type OrConditionWrapper = { OR: unknown[] };

const MOCK_FILTER_KEYS = {
	AREA: 'area',
	TYPE: 'type',
	SUBTYPE: 'subtype',
	STATUS: 'status'
};

const MOCK_FILTER_LABELS = {
	AREA_SUFFIX: 'case work area',
	TYPE_SUFFIX: 'case type',
	SUBTYPE_SUFFIX: 'subtype',
	STATUS_SUFFIX: 'status'
};

describe('FilterGenerator Integration Tests', () => {
	const generator = new FilterGenerator({
		keys: MOCK_FILTER_KEYS,
		labels: MOCK_FILTER_LABELS
	});
	const baseUrl = '/cases';

	describe('getAllSelectedValues Edge Cases', () => {
		it('should filter out empty strings from array query params', () => {
			const query = { type: ['', CASE_TYPES_ID.RIGHTS_OF_WAY, ''] };
			const [, types] = generator.getAllSelectedValues(query);

			assert.deepStrictEqual(types, [CASE_TYPES_ID.RIGHTS_OF_WAY]);
		});

		it('should filter out non-string values from array query params', () => {
			const query = { type: [CASE_TYPES_ID.RIGHTS_OF_WAY, { nested: 'value' }, CASE_TYPES_ID.COMMON_LAND] };
			const [, types] = generator.getAllSelectedValues(query);

			assert.deepStrictEqual(types, [CASE_TYPES_ID.RIGHTS_OF_WAY, CASE_TYPES_ID.COMMON_LAND]);
		});

		it('should return empty array for single empty string value', () => {
			const query = { type: '' };
			const [, types] = generator.getAllSelectedValues(query);

			assert.deepStrictEqual(types, []);
		});

		it('should return empty array for undefined query param', () => {
			const query = {};
			const [areas, types, subtypes, statuses] = generator.getAllSelectedValues(query);

			assert.deepStrictEqual(areas, []);
			assert.deepStrictEqual(types, []);
			assert.deepStrictEqual(subtypes, []);
			assert.deepStrictEqual(statuses, []);
		});

		it('should handle mixed valid and invalid values across all keys', () => {
			const query = {
				area: ['', CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND],
				type: CASE_TYPES_ID.RIGHTS_OF_WAY,
				subtype: ['', ''],
				status: [CASE_STATUS_ID.IN_PROGRESS, { nested: 'object' }]
			};

			const [areas, types, subtypes, statuses] = generator.getAllSelectedValues(query);

			assert.deepStrictEqual(areas, [CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND]);
			assert.deepStrictEqual(types, [CASE_TYPES_ID.RIGHTS_OF_WAY]);
			assert.deepStrictEqual(subtypes, []);
			assert.deepStrictEqual(statuses, [CASE_STATUS_ID.IN_PROGRESS]);
		});
	});

	describe('Query Logic', () => {
		it('should return undefined if query is empty', () => {
			const result = generator.createFilterWhereClause({});
			assert.strictEqual(result, undefined);
		});

		it('should build a query for a real "Rights of Way" subtype', () => {
			const query = { subtype: CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL };
			const result = generator.createFilterWhereClause(query);

			assert.deepStrictEqual(result, {
				AND: [
					{
						OR: [{ subTypeId: { in: [CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL] } }]
					}
				]
			});
		});

		it('should handle complex cross-area queries (RoW Area + Common Land Subtype)', () => {
			const query = {
				area: CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND,
				subtype: CASE_SUBTYPES_ID.WORKS_COMMON_LAND
			};

			const result = generator.createFilterWhereClause(query);
			const orConditions = (result?.AND[0] as OrConditionWrapper).OR;

			assert.deepStrictEqual(orConditions[0], {
				Type: { caseworkAreaId: { in: [CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND] } }
			});

			assert.deepStrictEqual(orConditions[1], {
				subTypeId: { in: [CASE_SUBTYPES_ID.WORKS_COMMON_LAND] }
			});
		});

		it('should handle array values for the same key', () => {
			const query = {
				type: [CASE_TYPES_ID.RIGHTS_OF_WAY, CASE_TYPES_ID.COMMON_LAND]
			};

			const result = generator.createFilterWhereClause(query);

			assert.deepStrictEqual(result, {
				AND: [
					{
						OR: [{ typeId: { in: [CASE_TYPES_ID.RIGHTS_OF_WAY, CASE_TYPES_ID.COMMON_LAND] } }]
					}
				]
			});
		});

		it('should combine all three levels (Area, Type, Subtype)', () => {
			const query = {
				area: CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND,
				type: CASE_TYPES_ID.RIGHTS_OF_WAY,
				subtype: CASE_SUBTYPES_ID.OPPOSED_DMMO
			};

			const result = generator.createFilterWhereClause(query);
			const conditions = (result?.AND[0] as OrConditionWrapper).OR;

			assert.strictEqual(conditions.length, 3);
			assert.deepStrictEqual(conditions[0], {
				Type: { caseworkAreaId: { in: [CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND] } }
			});
			assert.deepStrictEqual(conditions[1], { typeId: { in: [CASE_TYPES_ID.RIGHTS_OF_WAY] } });
			assert.deepStrictEqual(conditions[2], { subTypeId: { in: [CASE_SUBTYPES_ID.OPPOSED_DMMO] } });
		});

		it('should include Status in the query builder', () => {
			const query = {
				status: CASE_STATUS_ID.IN_PROGRESS
			};

			const result = generator.createFilterWhereClause(query);

			assert.deepStrictEqual(result, {
				AND: [
					{
						statusId: { in: [CASE_STATUS_ID.IN_PROGRESS] }
					}
				]
			});
		});

		it('should combine status with area/type/subtype filters using AND', () => {
			const query = {
				area: CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND,
				type: CASE_TYPES_ID.RIGHTS_OF_WAY,
				subtype: CASE_SUBTYPES_ID.OPPOSED_DMMO,
				status: CASE_STATUS_ID.IN_PROGRESS
			};

			const result = generator.createFilterWhereClause(query);

			assert.deepStrictEqual(result, {
				AND: [
					{
						OR: [
							{ Type: { caseworkAreaId: { in: [CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND] } } },
							{ typeId: { in: [CASE_TYPES_ID.RIGHTS_OF_WAY] } },
							{ subTypeId: { in: [CASE_SUBTYPES_ID.OPPOSED_DMMO] } }
						]
					},
					{
						statusId: { in: [CASE_STATUS_ID.IN_PROGRESS] }
					}
				]
			});
		});
	});

	describe('Checkbox Generation', () => {
		it('should generate the correct hierarchy for Rights of Way', () => {
			const result = generator.generateFilters({}, baseUrl, {});
			const groups = result.checkboxGroups.flat();

			const statusGroup = groups.find((g) => g.idPrefix === 'status-root');
			assert.ok(statusGroup, 'Status group should exist');
			assert.strictEqual(statusGroup?.legend, 'Select status');

			const statusTexts = statusGroup?.items.map((i) => i.text) || [];
			assert.ok(statusTexts.includes('In progress (0)'));
			assert.strictEqual(statusTexts.length, CASE_STATUSES.length);

			const areaGroup = groups.find((g) => g.idPrefix === 'area-root');
			const rowItem = areaGroup?.items.find((i) => i.value === CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND);
			assert.strictEqual(rowItem?.text, 'Rights of Way and Common Land (0)');

			const rowSubtypeGroup = groups.find((g) => g.idPrefix === `subtype-${CASE_TYPES_ID.RIGHTS_OF_WAY}`);
			assert.ok(rowSubtypeGroup, 'Subtype group for RoW should exist');

			const s14 = rowSubtypeGroup.items.find((i) => i.value === CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL);
			const dmmo = rowSubtypeGroup.items.find((i) => i.value === CASE_SUBTYPES_ID.OPPOSED_DMMO);

			assert.ok(s14, 'Schedule 14 Appeal should be listed');
			assert.ok(dmmo, 'Opposed DMMO should be listed');
		});

		it('should mark checkboxes as checked when present in query', () => {
			const query = {
				subtype: CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const groups = result.checkboxGroups.flat();

			const rowSubtypeGroup = groups.find((g) => g.idPrefix === `subtype-${CASE_TYPES_ID.RIGHTS_OF_WAY}`);

			const s14 = rowSubtypeGroup?.items.find((i) => i.value === CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL);
			const dmmo = rowSubtypeGroup?.items.find((i) => i.value === CASE_SUBTYPES_ID.OPPOSED_DMMO);

			assert.strictEqual(s14?.checked, true);
			assert.strictEqual(dmmo?.checked, false);
		});

		it('should handle multiple checked items in arrays', () => {
			const query = {
				type: [CASE_TYPES_ID.RIGHTS_OF_WAY, CASE_TYPES_ID.COMMON_LAND]
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const groups = result.checkboxGroups.flat();

			const typeGroup = groups.find((g) => g.idPrefix === `type-${CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND}`);

			const rowType = typeGroup?.items.find((i) => i.value === CASE_TYPES_ID.RIGHTS_OF_WAY);
			const clType = typeGroup?.items.find((i) => i.value === CASE_TYPES_ID.COMMON_LAND);

			assert.strictEqual(rowType?.checked, true);
			assert.strictEqual(clType?.checked, true);
		});

		it('should mark status checkboxes as checked when present in query', () => {
			const query = {
				status: [CASE_STATUS_ID.IN_PROGRESS, CASE_STATUS_ID.CLOSED]
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const groups = result.checkboxGroups.flat();
			const statusGroup = groups.find((g) => g.idPrefix === 'status-root');

			assert.strictEqual(statusGroup?.items.find((i) => i.value === CASE_STATUS_ID.IN_PROGRESS)?.checked, true);
			assert.strictEqual(statusGroup?.items.find((i) => i.value === CASE_STATUS_ID.CLOSED)?.checked, true);
		});
	});

	describe('Selected Categories (Tags)', () => {
		it('should generate selected tags for active filters', () => {
			const query = {
				subtype: CASE_SUBTYPES_ID.WORKS_COMMON_LAND
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			const subtypeCat = categories.find((c) => c.heading.text === 'Subtype');
			assert.ok(subtypeCat, 'Subtype category should exist');

			const tag = subtypeCat.items.find((i) => i.text === 'Works on Common Land');
			assert.ok(tag, 'Works on Common Land tag should exist');
			assert.strictEqual(tag.href, baseUrl);
		});

		it('should generate correct removal links retaining other query params', () => {
			const query = {
				area: CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND,
				subtype: CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL,
				page: '2'
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			const areaCat = categories.find((c) => c.heading.text === 'Case work area');
			assert.ok(areaCat, 'Area category should exist');

			const areaTag = areaCat.items[0];
			assert.ok(areaTag, 'Area tag should exist');

			assert.ok(areaTag.href.includes(`subtype=${CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL}`), 'Should keep subtype filter');
			assert.ok(areaTag.href.includes('page=2'), 'Should keep page parameter');
			assert.ok(!areaTag.href.includes(`area=`), 'Should remove area filter');
		});

		it('should generate status selected-category tags and removal links', () => {
			const query = {
				status: [CASE_STATUS_ID.IN_PROGRESS, CASE_STATUS_ID.CLOSED],
				page: '2'
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			const statusCat = categories.find((c) => c.heading.text === 'Status');
			assert.ok(statusCat);
			assert.strictEqual(statusCat?.items.length, 2);

			const inProgressTag = statusCat?.items.find((i) => i.text === 'In progress');
			assert.ok(inProgressTag);
			assert.ok(!inProgressTag?.href.includes(`status=${CASE_STATUS_ID.IN_PROGRESS}`));
			assert.ok(inProgressTag?.href.includes(`status=${CASE_STATUS_ID.CLOSED}`));
			assert.ok(inProgressTag?.href.includes('page=2'));
		});

		it('should handle removing one item from an array selection', () => {
			const query = {
				subtype: [CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL, CASE_SUBTYPES_ID.OPPOSED_DMMO]
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			const subtypeCat = categories.find((c) => c.heading.text === 'Subtype');
			assert.ok(subtypeCat, 'Subtype category should exist');

			const s14Tag = subtypeCat.items.find((i) => i.text === 'Schedule 14 Appeal');
			const dmmoTag = subtypeCat.items.find((i) => i.text.includes('Opposed'));

			assert.ok(s14Tag && dmmoTag, 'Both subtype tags should exist');

			assert.ok(s14Tag.href.includes(`subtype=${CASE_SUBTYPES_ID.OPPOSED_DMMO}`));
			assert.ok(!s14Tag.href.includes(`subtype=${CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL}`));
		});
	});
	describe('Fixed Heading Behavior', () => {
		it('should use "Case type" as fixed heading for all selected types regardless of area', () => {
			const query = {
				type: [CASE_TYPES_ID.RIGHTS_OF_WAY, CASE_TYPES_ID.COMMON_LAND]
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			// Should have only ONE category for types with fixed heading
			const typeCategories = categories.filter((c) => c.heading.text === 'Case type');
			assert.strictEqual(typeCategories.length, 1, 'Should have exactly one "Case type" category');

			// Should contain both types under the single heading
			const typeCategory = typeCategories[0];
			assert.strictEqual(typeCategory.items.length, 2, 'Should contain both selected types');

			const rowTypeTag = typeCategory.items.find((i) => i.text === 'Rights of Way');
			const clTypeTag = typeCategory.items.find((i) => i.text === 'Common Land');

			assert.ok(rowTypeTag, 'Rights of Way type should be in the category');
			assert.ok(clTypeTag, 'Common Land type should be in the category');
		});

		it('should use "Subtype" as fixed heading for all selected subtypes regardless of parent type', () => {
			const query = {
				subtype: [CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL, CASE_SUBTYPES_ID.WORKS_COMMON_LAND]
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			// Should have only ONE category for subtypes with fixed heading
			const subtypeCategories = categories.filter((c) => c.heading.text === 'Subtype');
			assert.strictEqual(subtypeCategories.length, 1, 'Should have exactly one "Subtype" category');

			// Should contain both subtypes under the single heading
			const subtypeCategory = subtypeCategories[0];
			assert.strictEqual(subtypeCategory.items.length, 2, 'Should contain both selected subtypes');

			const s14Tag = subtypeCategory.items.find((i) => i.text === 'Schedule 14 Appeal');
			const worksTag = subtypeCategory.items.find((i) => i.text === 'Works on Common Land');

			assert.ok(s14Tag, 'Schedule 14 Appeal should be in the category');
			assert.ok(worksTag, 'Works on Common Land should be in the category');
		});

		it('should generate correct removal links for types under fixed heading', () => {
			const query = {
				type: [CASE_TYPES_ID.RIGHTS_OF_WAY, CASE_TYPES_ID.COMMON_LAND],
				area: CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			const typeCategory = categories.find((c) => c.heading.text === 'Case type');
			assert.ok(typeCategory, 'Case type category should exist');

			const rowTypeTag = typeCategory.items.find((i) => i.text === 'Rights of Way');
			assert.ok(rowTypeTag, 'Rights of Way tag should exist');

			// Clicking this tag should remove only Rights of Way, keep Common Land and area
			assert.ok(rowTypeTag.href.includes(`type=${CASE_TYPES_ID.COMMON_LAND}`), 'Should keep Common Land type');
			assert.ok(
				rowTypeTag.href.includes(`area=${CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND}`),
				'Should keep area filter'
			);
			assert.ok(!rowTypeTag.href.includes(`type=${CASE_TYPES_ID.RIGHTS_OF_WAY}`), 'Should remove Rights of Way type');
		});

		it('should generate correct removal links for subtypes under fixed heading', () => {
			const query = {
				subtype: [CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL, CASE_SUBTYPES_ID.OPPOSED_DMMO],
				type: CASE_TYPES_ID.RIGHTS_OF_WAY
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			const subtypeCategory = categories.find((c) => c.heading.text === 'Subtype');
			assert.ok(subtypeCategory, 'Subtype category should exist');

			const dmmoTag = subtypeCategory.items.find((i) => i.text.includes('Opposed'));
			assert.ok(dmmoTag, 'Opposed DMMO tag should exist');

			// Clicking this tag should remove only Opposed DMMO, keep Schedule 14 and type
			assert.ok(
				dmmoTag.href.includes(`subtype=${CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL}`),
				'Should keep Schedule 14 Appeal'
			);
			assert.ok(dmmoTag.href.includes(`type=${CASE_TYPES_ID.RIGHTS_OF_WAY}`), 'Should keep type filter');
			assert.ok(!dmmoTag.href.includes(`subtype=${CASE_SUBTYPES_ID.OPPOSED_DMMO}`), 'Should remove Opposed DMMO');
		});

		it('should filter into same fixed heading when multiple filters are selected in same section', () => {
			// This tests that we DON'T get separate categories like:
			// "Rights of Way and Common Land case type"
			// and instead get a single "Case type" category with each in individual boxes
			const query = {
				type: [CASE_TYPES_ID.RIGHTS_OF_WAY, CASE_TYPES_ID.COMMON_LAND]
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			// Should NOT have area-specific type headings
			const areaSpecificHeading = categories.find((c) =>
				c.heading.text.includes('Rights of Way and Common Land case type')
			);
			assert.strictEqual(areaSpecificHeading, undefined, 'Should not have area-specific type heading');

			// Should have the fixed "Case type" heading instead
			const fixedHeading = categories.find((c) => c.heading.text === 'Case type');
			assert.ok(fixedHeading, 'Should have fixed "Case type" heading');
		});

		it('should handle single selected type with fixed heading', () => {
			const query = {
				type: CASE_TYPES_ID.RIGHTS_OF_WAY
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			const typeCategory = categories.find((c) => c.heading.text === 'Case type');
			assert.ok(typeCategory, 'Case type category should exist');
			assert.strictEqual(typeCategory.items.length, 1, 'Should have exactly one item');
			assert.strictEqual(typeCategory.items[0].text, 'Rights of Way');
		});

		it('should handle single selected subtype with fixed heading', () => {
			const query = {
				subtype: CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL
			};

			const result = generator.generateFilters(query, baseUrl, {});
			const categories = result.selectedCategories.categories;

			const subtypeCategory = categories.find((c) => c.heading.text === 'Subtype');
			assert.ok(subtypeCategory, 'Subtype category should exist');
			assert.strictEqual(subtypeCategory.items.length, 1, 'Should have exactly one item');
			assert.strictEqual(subtypeCategory.items[0].text, 'Schedule 14 Appeal');
		});
	});
});
