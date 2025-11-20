import {
	CASE_TYPES,
	CASEWORK_AREAS,
	CASE_SUBTYPES
} from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';

interface FilterItem {
	value: string;
	text: string;
	checked?: boolean;
}

interface SelectedFilterItem {
	href: string;
	text: string;
}

export interface FilterViewModel {
	checkboxGroups: Array<{
		idPrefix: string;
		name: string;
		legend: string;
		items: FilterItem[];
	}>;
	selectedCategories: {
		clearLinkHref: string;
		categories: Array<{
			heading: { text: string };
			items: SelectedFilterItem[];
		}>;
	};
}

const FILTER_KEYS = {
	TYPE: 'type',
	SUBTYPE: 'subtype'
};

const FILTER_LABELS = {
	TYPE: 'Case Type',
	SUBTYPE: 'Case Sub-Type'
};

function getSelectedValues(query: Record<string, any>, key: string): string[] {
	const val = query[key];
	if (Array.isArray(val)) return val;
	if (typeof val === 'string' && val) return [val];
	return [];
}

function createGenericCheckboxGroups<
	TGroup extends { id: string; displayName?: string },
	TItem extends { id: string; displayName?: string }
>(groups: TGroup[], items: TItem[], relationKey: keyof TItem, queryParamKey: string, selectedValues: string[]) {
	return groups
		.map((group) => {
			const itemsInGroup = items.filter((item) => item[relationKey] === group.id);

			if (itemsInGroup.length === 0) return null;

			const filterItems: FilterItem[] = itemsInGroup.map((item) => ({
				value: item.id,
				text: item.displayName || '',
				checked: selectedValues.includes(item.id)
			}));

			return {
				idPrefix: `${queryParamKey}-${group.id}`,
				name: queryParamKey,
				legend: group.displayName || '',
				items: filterItems
			};
		})
		.filter((group): group is NonNullable<typeof group> => group !== null);
}

function createSelectedTags(
	allItems: Array<{ id: string; displayName?: string }>,
	queryKey: string,
	query: Record<string, any>,
	baseUrl: string
): SelectedFilterItem[] {
	const selectedValues = getSelectedValues(query, queryKey);
	const tags: SelectedFilterItem[] = [];

	for (const value of selectedValues) {
		const itemConfig = allItems.find((i) => i.id === value);
		if (!itemConfig) continue;

		const params = new URLSearchParams();

		Object.keys(query).forEach((key) => {
			if (key !== queryKey) {
				const vals = getSelectedValues(query, key);
				vals.forEach((v) => params.append(key, v));
			}
		});

		const valuesToKeep = selectedValues.filter((v) => v !== value);
		valuesToKeep.forEach((v) => params.append(queryKey, v));

		const queryString = params.toString();

		tags.push({
			text: itemConfig.displayName || '',
			href: queryString ? `${baseUrl}?${queryString}` : baseUrl
		});
	}

	return tags;
}

export function generateFilters(query: Record<string, any>, baseUrl: string): FilterViewModel {
	const selectedTypes = getSelectedValues(query, FILTER_KEYS.TYPE);
	const selectedSubTypes = getSelectedValues(query, FILTER_KEYS.SUBTYPE);

	const typeGroups = createGenericCheckboxGroups(
		CASEWORK_AREAS,
		CASE_TYPES,
		'caseworkAreaId',
		FILTER_KEYS.TYPE,
		selectedTypes
	);

	const subTypeGroups = createGenericCheckboxGroups(
		CASE_TYPES,
		CASE_SUBTYPES,
		'parentTypeId',
		FILTER_KEYS.SUBTYPE,
		selectedSubTypes
	);

	const typeTags = createSelectedTags(CASE_TYPES, FILTER_KEYS.TYPE, query, baseUrl);
	const subTypeTags = createSelectedTags(CASE_SUBTYPES, FILTER_KEYS.SUBTYPE, query, baseUrl);

	const categories = [];
	if (typeTags.length > 0) {
		categories.push({ heading: { text: FILTER_LABELS.TYPE }, items: typeTags });
	}
	if (subTypeTags.length > 0) {
		categories.push({ heading: { text: FILTER_LABELS.SUBTYPE }, items: subTypeTags });
	}

	return {
		checkboxGroups: [...typeGroups, ...subTypeGroups],
		selectedCategories: {
			clearLinkHref: baseUrl,
			categories
		}
	};
}

export function createFilterWhereClause(query: Record<string, any>) {
	const selectedTypes = getSelectedValues(query, FILTER_KEYS.TYPE);
	const selectedSubTypes = getSelectedValues(query, FILTER_KEYS.SUBTYPE);

	if (selectedTypes.length === 0 && selectedSubTypes.length === 0) {
		return undefined;
	}

	const where: any = {
		OR: []
	};

	if (selectedTypes.length > 0) {
		where.OR.push({ typeId: { in: selectedTypes } });
	}

	if (selectedSubTypes.length > 0) {
		where.OR.push({ subTypeId: { in: selectedSubTypes } });
	}

	return where;
}
