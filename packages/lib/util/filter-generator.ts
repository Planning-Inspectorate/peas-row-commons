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
			heading: string;
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
	private readonly config: FilterConfig;
	private static readonly typeToArea: Map<string, string> = new Map(CASE_TYPES.map((t) => [t.id, t.caseworkAreaId]));
	private static readonly subtypeToType: Map<string, string> = new Map(
		CASE_SUBTYPES.map((s) => [s.id, s.parentTypeId])
	);

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

		const hierarchyConditions = this.buildHierarchyConditions(selectedAreas, selectedTypes, selectedSubTypes);

		const where: FilterWhereClause = {
			AND: []
		};

		if (hierarchyConditions.length > 0) {
			where.AND.push({ OR: hierarchyConditions });
		}

		if (selectedStatuses.length > 0) {
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
			baseUrl,
			'Case type' // Fixed heading
		);

		const selectedSubTypeCategories = this.createGroupedSelectedCategories(
			CASE_TYPES,
			CASE_SUBTYPES,
			'parentTypeId',
			keys.SUBTYPE,
			labels.SUBTYPE_SUFFIX,
			query,
			baseUrl,
			'Subtype' // Fixed heading
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
		baseUrl: string,
		fixedHeading?: string // Optional fixed heading
	) {
		const selectedValues = this.getSelectedValues(query, queryParamKey);

		if (selectedValues.length === 0) return [];

		// If fixedHeading is provided, merge all groups into one category
		if (fixedHeading) {
			const selectedItems = items.filter((item) => selectedValues.includes(item.id));

			if (selectedItems.length === 0) return [];

			const categoryItems: SelectedFilterItem[] = selectedItems.map((item) => {
				return {
					text: item.displayName || '',
					href: this.buildRemovalUrl(item.id, queryParamKey, selectedValues, query, baseUrl)
				};
			});

			return [
				{
					heading: { text: fixedHeading },
					items: categoryItems
				}
			];
		}

		// Original grouped behavior
		return groups
			.map((group) => {
				const selectedItemsInGroup = items.filter(
					(item) => item[relationKey] === group.id && selectedValues.includes(item.id)
				);

				if (selectedItemsInGroup.length === 0) return null;

				const categoryItems: SelectedFilterItem[] = selectedItemsInGroup.map((item) => {
					return {
						text: item.displayName || '',
						href: this.buildRemovalUrl(item.id, queryParamKey, selectedValues, query, baseUrl)
					};
				});

				return {
					heading: { text: `${group.displayName} ${suffix}`.trim() },
					items: categoryItems
				};
			})
			.filter((category): category is NonNullable<typeof category> => category !== null);
	}

	/**
	 * Formats the Case Areas, Case Types, Case Subtypes into checkbox groupings:
	 * - Case work area (all areas)
	 * - Case type (grouped by casework area)
	 * - Sub type (grouped by type)
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
		const { keys } = this.config;

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
				legend: 'Case work area',
				heading: 'Case work area',
				items: areaItems
			}
		]);

		const caseTypeGroups = CASEWORK_AREAS.map((area) => {
			const typesInArea = CASE_TYPES.filter((type) => type.caseworkAreaId === area.id);

			if (typesInArea.length === 0) return null;

			const filterItems: FilterItem[] = typesInArea.map((type) => ({
				value: type.id,
				text: this.formatLabelWithCount(type.displayName || '', counts[type.id]),
				checked: selectedTypes.includes(type.id)
			}));

			return {
				idPrefix: `${keys.TYPE}-${area.id}`,
				name: keys.TYPE,
				legend: `${area.displayName || ''}`,
				heading: 'Case type',
				items: filterItems
			};
		}).filter((group): group is NonNullable<typeof group> => group !== null);

		if (caseTypeGroups.length > 0) {
			checkboxGroups.push(caseTypeGroups);
		}

		const subTypeGroups = CASE_TYPES.map((type) => {
			const subTypesInType = CASE_SUBTYPES.filter((subType) => subType.parentTypeId === type.id);

			if (subTypesInType.length === 0) return null;

			const filterItems: FilterItem[] = subTypesInType.map((subType) => ({
				value: subType.id,
				text: this.formatLabelWithCount(subType.displayName || '', counts[subType.id]),
				checked: selectedSubTypes.includes(subType.id)
			}));

			return {
				idPrefix: `${keys.SUBTYPE}-${type.id}`,
				name: keys.SUBTYPE,
				legend: `${type.displayName || ''}`,
				heading: 'Subtype',
				items: filterItems
			};
		}).filter((group): group is NonNullable<typeof group> => group !== null);

		if (subTypeGroups.length > 0) {
			checkboxGroups.push(subTypeGroups);
		}

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
				heading: 'Status',
				items: statusItems
			}
		]);

		return checkboxGroups;
	}

	/**
	 * Builds hierarchy-aware conditions with "lowest-level wins" semantics.
	 *
	 * When a child selection (Type/Subtype) falls under a selected parent (Area/Type),
	 * the parent is considered redundant and excluded. This restricts results to the
	 * most specific selection within each lineage branch.
	 * Example: Selecting "Planning" area + "Listed Building" type (under Planning)
	 * → Returns only "Listed Building" cases, not all Planning cases.
	 *
	 * Cross-branch selections are OR'd together:
	 * Example: Selecting "Planning" area + "Highway" type (under Rights of Way)
	 * → Returns all Planning cases OR Highway cases. */
	private buildHierarchyConditions(
		selectedAreas: string[],
		selectedTypes: string[],
		selectedSubTypes: string[]
	): FilterOrCondition[] {
		const conditions: FilterOrCondition[] = [];

		// Track which types and areas are "covered" by more specific selections
		const typesCoveredBySubtype = new Set<string>();
		const areasCoveredByType = new Set<string>();

		const subTypes: string[] = [];
		// 1. Add all selected subtypes directly
		for (const subTypeId of selectedSubTypes) {
			subTypes.push(subTypeId);
			// Mark parent type as covered
			const parentTypeId = FilterGenerator.subtypeToType.get(subTypeId);
			if (parentTypeId) {
				typesCoveredBySubtype.add(parentTypeId);
				// Also mark the area as covered
				const areaId = FilterGenerator.typeToArea.get(parentTypeId);
				if (areaId) {
					areasCoveredByType.add(areaId);
				}
			}
		}

		const types: string[] = [];
		// 2. Add selected types that aren't covered by a subtype selection
		for (const typeId of selectedTypes) {
			if (typesCoveredBySubtype.has(typeId)) continue;
			types.push(typeId);
			// Mark parent area as covered
			const areaId = FilterGenerator.typeToArea.get(typeId);
			if (areaId) {
				areasCoveredByType.add(areaId);
			}
		}

		const areas: string[] = [];
		// 3. Add selected areas that aren't covered by a type/subtype selection
		for (const areaId of selectedAreas) {
			if (areasCoveredByType.has(areaId)) continue;
			areas.push(areaId);
		}

		if (areas.length) conditions.push({ Type: { caseworkAreaId: { in: areas } } });
		if (types.length) conditions.push({ typeId: { in: types } });
		if (subTypes.length) conditions.push({ subTypeId: { in: subTypes } });

		return conditions;
	}

	/**
	 * Helper to format the string with the count.
	 */
	private formatLabelWithCount(label: string, count: number | undefined): string {
		return `${label} (${count || 0})`;
	}
}
