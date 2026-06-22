import {
	CASE_TYPES,
	CASEWORK_AREAS,
	CASE_SUBTYPES,
	CASE_STATUSES
} from '@pins/peas-row-commons-database/src/seed/static-data/index.ts';
import type { ParsedQs } from 'qs';

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
	checkboxGroups: Array<
		Array<{
			idPrefix: string;
			name: string;
			legend: string;
			items: FilterItem[];
		}>
	>;
	selectedCategories: {
		clearLinkHref: string;
		categories: Array<{
			heading: { text: string };
			items: SelectedFilterItem[];
		}>;
	};
}

interface FilterConfig {
	keys: {
		AREA: string;
		TYPE: string;
		SUBTYPE: string;
		STATUS: string;
	};
	labels: {
		AREA_SUFFIX: string;
		TYPE_SUFFIX: string;
		SUBTYPE_SUFFIX: string;
		STATUS_SUFFIX: string;
	};
}

type CountMap = Record<string, number>;

type AreaCondition = {
	Type: {
		caseworkAreaId: {
			in: string[];
		};
	};
};

type TypeCondition = {
	typeId: {
		in: string[];
	};
};

type SubTypeCondition = {
	subTypeId: {
		in: string[];
	};
};

type StatusCondition = {
	statusId: {
		in: string[];
	};
};

type FilterOrCondition = AreaCondition | TypeCondition | SubTypeCondition;
type FilterAndCondition = { OR: FilterOrCondition[] } | StatusCondition;
export type FilterWhereClause = { AND: FilterAndCondition[] };
type SelectedValuesTuple = [string[], string[], string[], string[]];

/**
 * Class that generates the filter data, formatted ready for use in the
 * MoJ filter component used on the landing page. Needs to create 2 sets of
 * data: (1) currently selected items in top component (2) groups of checkboxes
 */
export class FilterGenerator {
	private config: FilterConfig;

	constructor(params: FilterConfig) {
		this.config = params;
	}

	/**
	 * Creates the filters used in the filter component, including the checkboxes to be ticked
	 * and the currently selected categories that are displayed in the top section of the component.
	 */
	public generateFilters(query: ParsedQs, baseUrl: string, counts: CountMap): FilterViewModel {
		const [selectedAreas, selectedTypes, selectedSubTypes, selectedStatuses] = this.getAllSelectedValues(query);

		const checkboxGroups = this.generateAllCheckboxes(
			selectedAreas,
			selectedTypes,
			selectedSubTypes,
			selectedStatuses,
			counts
		);

		const [selectedAreaCategories, selectedTypeCategories, selectedSubTypeCategories] = this.createSelectedCategories(
			query,
			baseUrl
		);

		return {
			checkboxGroups: checkboxGroups,
			selectedCategories: {
				clearLinkHref: baseUrl,
				categories: [
					...selectedAreaCategories,
					...selectedTypeCategories,
					...selectedSubTypeCategories,
					...this.createSelectedStatusCategories(query, baseUrl)
				]
			}
		};
	}

	/**
	 * Creates the where clause used in the query based on the currently selected items
	 * (area, type, and subtype)
	 */
	public createFilterWhereClause(query: ParsedQs): FilterWhereClause | undefined {
		const [selectedAreas, selectedTypes, selectedSubTypes, selectedStatuses] = this.getAllSelectedValues(query);

		if (
			selectedAreas.length === 0 &&
			selectedTypes.length === 0 &&
			selectedSubTypes.length === 0 &&
			selectedStatuses.length === 0
		) {
			return undefined;
		}

		const where: FilterWhereClause = {
			AND: []
		};

		const orConditions: FilterOrCondition[] = [];

		if (selectedAreas.length) {
			orConditions.push({
				Type: {
					caseworkAreaId: { in: selectedAreas }
				}
			});
		}

		if (selectedTypes.length) {
			orConditions.push({ typeId: { in: selectedTypes } });
		}

		if (selectedSubTypes.length) {
			orConditions.push({ subTypeId: { in: selectedSubTypes } });
		}

		if (orConditions.length) {
			where.AND.push({ OR: orConditions });
		}

		if (selectedStatuses.length) {
			where.AND.push({ statusId: { in: selectedStatuses } });
		}

		return where.AND.length > 0 ? where : undefined;
	}

	public getAllSelectedValues(query: ParsedQs): SelectedValuesTuple {
		const { keys } = this.config;

		const selectedAreas = this.getSelectedValues(query, keys.AREA);
		const selectedTypes = this.getSelectedValues(query, keys.TYPE);
		const selectedSubTypes = this.getSelectedValues(query, keys.SUBTYPE);
		const selectedStatuses = this.getSelectedValues(query, keys.STATUS);

		return [selectedAreas, selectedTypes, selectedSubTypes, selectedStatuses];
	}

	/**
	 * Checks if current value is in the query params as "selected"
	 */
	private getSelectedValues(query: ParsedQs, key: string): string[] {
		const val = query[key];
		if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string' && v !== '');
		if (typeof val === 'string' && val) return [val];
		return [];
	}

	/**
	 * Builds a URL that removes a specific item from the current query params.
	 * Used to generate "remove filter" links in selected category tags.
	 */
	private buildRemovalUrl(
		itemId: string,
		queryParamKey: string,
		selectedValues: string[],
		query: ParsedQs,
		baseUrl: string
	): string {
		const params = new URLSearchParams();

		Object.keys(query).forEach((key) => {
			if (key !== queryParamKey) {
				const vals = this.getSelectedValues(query, key);
				vals.forEach((value) => params.append(key, value));
			}
		});

		const valuesToKeep = selectedValues.filter((value) => value !== itemId);
		valuesToKeep.forEach((value) => params.append(queryParamKey, value));

		const queryString = params.toString();
		return queryString ? `${baseUrl}?${queryString}` : baseUrl;
	}

	/**
	 * Formats the Case Areas, Case Types and Case Subtypes currently selected into
	 * their own objects ready for displaying to the user in the component.
	 */
	private createSelectedCategories(query: ParsedQs, baseUrl: string) {
		const { keys, labels } = this.config;

		const selectedAreaCategories = this.createFlatSelectedCategories(
			CASEWORK_AREAS,
			keys.AREA,
			labels.AREA_SUFFIX,
			query,
			baseUrl
		);

		const selectedTypeCategories = this.createGroupedSelectedCategories(
			CASEWORK_AREAS,
			CASE_TYPES,
			'caseworkAreaId',
			keys.TYPE,
			labels.TYPE_SUFFIX,
			query,
			baseUrl
		);

		const selectedSubTypeCategories = this.createGroupedSelectedCategories(
			CASE_TYPES,
			CASE_SUBTYPES,
			'parentTypeId',
			keys.SUBTYPE,
			labels.SUBTYPE_SUFFIX,
			query,
			baseUrl
		);

		return [selectedAreaCategories, selectedTypeCategories, selectedSubTypeCategories];
	}

	/**
	 * Formats the case Statuses currently selected into their own objects ready for displaying to the user in the component.
	 * They are formatted slightly differently as they don't have a parent-child relationship like case types.
	 */
	private createSelectedStatusCategories(query: ParsedQs, baseUrl: string) {
		const { keys, labels } = this.config;

		return this.createFlatSelectedCategories(CASE_STATUSES, keys.STATUS, labels.STATUS_SUFFIX, query, baseUrl);
	}

	/**
	 * Creates selected category items for flat (non-hierarchical) filter data.
	 * Used for filters like Status and Area that don't have parent-child relationships.
	 */
	private createFlatSelectedCategories(
		items: Array<{ id: string; displayName?: string }>,
		queryParamKey: string,
		heading: string,
		query: ParsedQs,
		baseUrl: string
	) {
		const selectedValues = this.getSelectedValues(query, queryParamKey);

		if (selectedValues.length === 0) return [];

		const selectedItems = items.filter((item) => selectedValues.includes(item.id));

		if (selectedItems.length === 0) return [];

		const categoryItems: SelectedFilterItem[] = selectedItems.map((item) => ({
			text: item.displayName || '',
			href: this.buildRemovalUrl(item.id, queryParamKey, selectedValues, query, baseUrl)
		}));

		// Capitalise the first letter of the heading
		const headingText = heading.charAt(0).toUpperCase() + heading.slice(1);

		return [
			{
				heading: { text: headingText },
				items: categoryItems
			}
		];
	}

	/**
	 * Creates a group of selected items for an item:
	 * (e.g. all types for a casework area, or all subtypes for a type)
	 */
	private createGroupedSelectedCategories<
		TGroup extends { id: string; displayName?: string },
		TItem extends { id: string; displayName?: string }
	>(
		groups: TGroup[],
		items: TItem[],
		relationKey: keyof TItem,
		queryParamKey: string,
		suffix: string,
		query: ParsedQs,
		baseUrl: string
	) {
		const selectedValues = this.getSelectedValues(query, queryParamKey);

		if (selectedValues.length === 0) return [];

		return groups
			.map((group) => {
				const selectedItemsInGroup = items.filter(
					(item) => item[relationKey] === group.id && selectedValues.includes(item.id)
				);

				if (selectedItemsInGroup.length === 0) return null;

				const categoryItems: SelectedFilterItem[] = selectedItemsInGroup.map((item) => ({
					text: item.displayName || '',
					href: this.buildRemovalUrl(item.id, queryParamKey, selectedValues, query, baseUrl)
				}));

				return {
					heading: { text: `${group.displayName} ${suffix}`.trim() },
					items: categoryItems
				};
			})
			.filter((category): category is NonNullable<typeof category> => category !== null);
	}

	/**
	 * Formats the Case Areas, Case Types and Case Subtypes into the checkbox groupings following the format:
	 * Casework Area A to Casework A Types to Casework A Subtypes, then the same for B.
	 *
	 * We nest the groupings so that we can insert a break line between the subsections.
	 */
	private generateAllCheckboxes(
		selectedAreas: string[],
		selectedTypes: string[],
		selectedSubTypes: string[],
		selectedStatuses: string[],
		counts: CountMap
	) {
		const { keys, labels } = this.config;

		const checkboxGroups = [];

		const areaItems: FilterItem[] = CASEWORK_AREAS.map((area) => ({
			value: area.id,
			text: this.formatLabelWithCount(area.displayName || '', counts[area.id]),
			checked: selectedAreas.includes(area.id)
		}));

		checkboxGroups.push([
			{
				idPrefix: `${keys.AREA}-root`,
				name: keys.AREA,
				legend: 'Select case work area',
				items: areaItems
			}
		]);

		CASEWORK_AREAS.forEach((area) => {
			const grouping = [];

			const typeGroupsForArea = this.createGenericCheckboxGroups(
				[area],
				CASE_TYPES,
				'caseworkAreaId',
				keys.TYPE,
				labels.TYPE_SUFFIX,
				selectedTypes,
				counts
			);

			grouping.push(...typeGroupsForArea);

			const typesInArea = CASE_TYPES.filter((type) => type.caseworkAreaId === area.id);
			const subTypeGroupsForArea = this.createGenericCheckboxGroups(
				typesInArea,
				CASE_SUBTYPES,
				'parentTypeId',
				keys.SUBTYPE,
				labels.SUBTYPE_SUFFIX,
				selectedSubTypes,
				counts
			);

			grouping.push(...subTypeGroupsForArea);

			checkboxGroups.push(grouping);
		});

		const statusItems: FilterItem[] = CASE_STATUSES.map((status) => ({
			value: status.id,
			text: this.formatLabelWithCount(status.displayName || '', counts[status.id]),
			checked: selectedStatuses.includes(status.id)
		}));

		checkboxGroups.push([
			{
				idPrefix: `${keys.STATUS}-root`,
				name: keys.STATUS,
				legend: 'Select status',
				items: statusItems
			}
		]);

		return checkboxGroups;
	}

	/**
	 * Creates a group of checkboxes for an item:
	 * (e.g. all types for a casework area, or all subtypes for a type)
	 */
	private createGenericCheckboxGroups<
		TGroup extends { id: string; displayName?: string },
		TItem extends { id: string; displayName?: string }
	>(
		groups: TGroup[],
		items: TItem[],
		relationKey: keyof TItem,
		queryParamKey: string,
		suffix: string,
		selectedValues: string[],
		counts: CountMap
	) {
		return groups
			.map((group) => {
				const itemsInGroup = items.filter((item) => item[relationKey] === group.id);

				if (itemsInGroup.length === 0) return null;

				const filterItems: FilterItem[] = itemsInGroup.map((item) => ({
					value: item.id,
					text: this.formatLabelWithCount(item.displayName || '', counts[item.id]),
					checked: selectedValues.includes(item.id)
				}));

				return {
					idPrefix: `${queryParamKey}-${group.id}`,
					name: queryParamKey,
					legend: `Select ${group.displayName} ${suffix}`,
					items: filterItems
				};
			})
			.filter((group): group is NonNullable<typeof group> => group !== null);
	}

	/**
	 * Helper to format the string with the count.
	 */
	private formatLabelWithCount(label: string, count: number | undefined): string {
		return `${label} (${count || 0})`;
	}
}
