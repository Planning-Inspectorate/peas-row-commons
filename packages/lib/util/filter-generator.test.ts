import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	CASEWORK_AREAS_ID,
	CASE_TYPES_ID,
	CASE_SUBTYPES_ID
} from '@pins/peas-row-commons-database/src/seed/static_data/ids/index.ts';
import { FilterGenerator } from './filter-generator.ts';

const MOCK_FILTER_KEYS = {
	AREA: 'area',
	TYPE: 'type',
	SUBTYPE: 'subtype'
};

const MOCK_FILTER_LABELS = {
	AREA_SUFFIX: 'case work area',
	TYPE_SUFFIX: 'case type',
	SUBTYPE_SUFFIX: 'subtype'
};

describe('FilterGenerator Integration Tests', () => {
	const generator = new FilterGenerator({
		keys: MOCK_FILTER_KEYS,
		labels: MOCK_FILTER_LABELS
	});
	const baseUrl = '/cases';

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
			const orConditions = result?.AND[0].OR;

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
			const conditions = result?.AND[0].OR;

			assert.strictEqual(conditions.length, 3);
			assert.deepStrictEqual(conditions[0], {
				Type: { caseworkAreaId: { in: [CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND] } }
			});
			assert.deepStrictEqual(conditions[1], { typeId: { in: [CASE_TYPES_ID.RIGHTS_OF_WAY] } });
			assert.deepStrictEqual(conditions[2], { subTypeId: { in: [CASE_SUBTYPES_ID.OPPOSED_DMMO] } });
		});
	});

	describe('Checkbox Generation', () => {
		it('should generate the correct hierarchy for Rights of Way', () => {
			const result = generator.generateFilters({}, baseUrl);
			const groups = result.checkboxGroups.flat();

			const areaGroup = groups.find((g) => g.idPrefix === 'area-root');
			const rowItem = areaGroup?.items.find((i) => i.value === CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND);
			assert.strictEqual(rowItem?.text, 'Rights of Way and Common Land');

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

			const result = generator.generateFilters(query, baseUrl);
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

			const result = generator.generateFilters(query, baseUrl);
			const groups = result.checkboxGroups.flat();

			const typeGroup = groups.find((g) => g.idPrefix === `type-${CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND}`);

			const rowType = typeGroup?.items.find((i) => i.value === CASE_TYPES_ID.RIGHTS_OF_WAY);
			const clType = typeGroup?.items.find((i) => i.value === CASE_TYPES_ID.COMMON_LAND);

			assert.strictEqual(rowType?.checked, true);
			assert.strictEqual(clType?.checked, true);
		});
	});

	describe('Selected Categories (Tags)', () => {
		it('should generate selected tags for active filters', () => {
			const query = {
				subtype: CASE_SUBTYPES_ID.WORKS_COMMON_LAND
			};

			const result = generator.generateFilters(query, baseUrl);
			const categories = result.selectedCategories.categories;

			const commonLandCat = categories.find((c) => c.heading.text.includes('Common Land'));
			assert.ok(commonLandCat);

			const tag = commonLandCat.items.find((i) => i.text === 'Works on Common Land');
			assert.ok(tag);
			assert.strictEqual(tag.href, baseUrl);
		});

		it('should generate correct removal links retaining other query params', () => {
			const query = {
				area: CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND,
				subtype: CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL,
				page: '2'
			};

			const result = generator.generateFilters(query, baseUrl);
			const categories = result.selectedCategories.categories;

			const areaCat = categories.find((c) => c.heading.text.includes('Rights of Way'));
			const areaTag: any = areaCat?.items[0];

			assert.ok(!areaTag.href.includes(`subtype=${CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL}`));
			assert.ok(areaTag.href.includes('page=2'));
			assert.ok(areaTag.href.includes(`area=${CASEWORK_AREAS_ID.RIGHTS_OF_WAY_COMMON_LAND}`));
		});

		it('should handle removing one item from an array selection', () => {
			const query = {
				subtype: [CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL, CASE_SUBTYPES_ID.OPPOSED_DMMO]
			};

			const result = generator.generateFilters(query, baseUrl);
			const categories = result.selectedCategories.categories;

			const subtypeCat = categories.find((c) => c.heading.text.includes('subtype'));

			const s14Tag = subtypeCat?.items.find((i) => i.text === 'Schedule 14 Appeal');
			const dmmoTag = subtypeCat?.items.find((i) => i.text.includes('Opposed'));

			assert.ok(s14Tag && dmmoTag);

			assert.ok(s14Tag.href.includes(`subtype=${CASE_SUBTYPES_ID.OPPOSED_DMMO}`));
			assert.ok(!s14Tag.href.includes(`subtype=${CASE_SUBTYPES_ID.SCHEDULE_14_APPEAL}`));
		});
	});
});
