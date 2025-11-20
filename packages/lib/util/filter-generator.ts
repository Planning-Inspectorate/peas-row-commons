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

interface FilterConfig {
	keys: {
		AREA: string;
		TYPE: string;
		SUBTYPE: string;
	};
	labels: {
		AREA_SUFFIX: string;
		TYPE_SUFFIX: string;
		SUBTYPE_SUFFIX: string;
	};
}

export class FilterGenerator {
	private config: FilterConfig;

	constructor(params: FilterConfig) {
		this.config = params;
	}

	public generateFilters(query: Record<string, any>, baseUrl: string): FilterViewModel {
		const [selectedAreas, selectedTypes, selectedSubTypes] = this.getAllSelectedValues(query);

		const checkboxGroups = this.generateAllCheckboxes(selectedAreas, selectedTypes, selectedSubTypes);

		const [selectedAreaCategories, selectedTypeCategories, selectedSubTypeCategories] = this.createSelectedCategories(
			query,
			baseUrl
		);

		return {
			checkboxGroups: checkboxGroups,
			selectedCategories: {
				clearLinkHref: baseUrl,
				categories: [...selectedAreaCategories, ...selectedTypeCategories, ...selectedSubTypeCategories]
			}
		};
	}

	public createFilterWhereClause(query: Record<string, any>) {
		const { keys } = this.config;
		const selectedAreas = this.getSelectedValues(query, keys.AREA);
		const selectedTypes = this.getSelectedValues(query, keys.TYPE);
		const selectedSubTypes = this.getSelectedValues(query, keys.SUBTYPE);

		if (selectedAreas.length === 0 && selectedTypes.length === 0 && selectedSubTypes.length === 0) {
			return undefined;
		}

		const where: any = {
			AND: []
		};

		const orConditions: Record<string, any>[] = [];

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

		return where.AND.length > 0 ? where : undefined;
	}

	private getAllSelectedValues(query: Record<string, any>) {
		const { keys } = this.config;

		const selectedAreas = this.getSelectedValues(query, keys.AREA);
		const selectedTypes = this.getSelectedValues(query, keys.TYPE);
		const selectedSubTypes = this.getSelectedValues(query, keys.SUBTYPE);

		return [selectedAreas, selectedTypes, selectedSubTypes];
	}

	private createSelectedCategories(query: Record<string, any>, baseUrl: string) {
		const { keys, labels } = this.config;

		const selectedAreaCategories = this.createGroupedSelectedCategories(
			[{ id: 'root', displayName: 'Select' }],
			CASEWORK_AREAS.map((area) => ({ ...area, rootId: 'root' })),
			'rootId',
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

	private generateAllCheckboxes(selectedAreas: string[], selectedTypes: string[], selectedSubTypes: string[]) {
		const { keys, labels } = this.config;

		const checkboxGroups = [];

		const areaItems: FilterItem[] = CASEWORK_AREAS.map((area) => ({
			value: area.id,
			text: area.displayName || '',
			checked: selectedAreas.includes(area.id)
		}));

		checkboxGroups.push({
			idPrefix: `${keys.AREA}-root`,
			name: keys.AREA,
			legend: 'Select case work area',
			items: areaItems
		});

		CASEWORK_AREAS.forEach((area) => {
			const typeGroupsForArea = this.createGenericCheckboxGroups(
				[area],
				CASE_TYPES,
				'caseworkAreaId',
				keys.TYPE,
				labels.TYPE_SUFFIX,
				selectedTypes
			);

			checkboxGroups.push(...typeGroupsForArea);

			const typesInArea = CASE_TYPES.filter((t) => t.caseworkAreaId === area.id);
			const subTypeGroupsForArea = this.createGenericCheckboxGroups(
				typesInArea,
				CASE_SUBTYPES,
				'parentTypeId',
				keys.SUBTYPE,
				labels.SUBTYPE_SUFFIX,
				selectedSubTypes
			);

			checkboxGroups.push(...subTypeGroupsForArea);
		});

		return checkboxGroups;
	}

	private createGenericCheckboxGroups<
		TGroup extends { id: string; displayName?: string },
		TItem extends { id: string; displayName?: string }
	>(
		groups: TGroup[],
		items: TItem[],
		relationKey: keyof TItem,
		queryParamKey: string,
		suffix: string,
		selectedValues: string[]
	) {
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
					legend: `Select ${group.displayName} ${suffix}`,
					items: filterItems
				};
			})
			.filter((group): group is NonNullable<typeof group> => group !== null);
	}

	private createGroupedSelectedCategories<
		TGroup extends { id: string; displayName?: string },
		TItem extends { id: string; displayName?: string }
	>(
		groups: TGroup[],
		items: TItem[],
		relationKey: keyof TItem,
		queryParamKey: string,
		suffix: string,
		query: Record<string, any>,
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

				const categoryItems: SelectedFilterItem[] = selectedItemsInGroup.map((item) => {
					const params = new URLSearchParams();

					Object.keys(query).forEach((key) => {
						if (key !== queryParamKey) {
							const vals = this.getSelectedValues(query, key);
							vals.forEach((v) => params.append(key, v));
						}
					});

					const valuesToKeep = selectedValues.filter((v) => v !== item.id);
					valuesToKeep.forEach((v) => params.append(queryParamKey, v));

					const queryString = params.toString();

					return {
						text: item.displayName || '',
						href: queryString ? `${baseUrl}?${queryString}` : baseUrl
					};
				});

				return {
					heading: { text: `${group.displayName} ${suffix}`.trim() },
					items: categoryItems
				};
			})
			.filter((category) => category !== null);
	}

	private getSelectedValues(query: Record<string, any>, key: string): string[] {
		const val = query[key];
		if (Array.isArray(val)) return val;
		if (typeof val === 'string' && val) return [val];
		return [];
	}
}
