import { CASE_TYPES_ID, CASEWORK_AREAS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/index.ts';

import type { DataPoint, GroupRelationships, UIGroup } from './types.ts';

/**
 * Converts a key in kebab-case into camelCase
 */
const kebabToCamel = (str: string): string => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

/**
 * Takes an object and creates the same object but with the keys changed to camelCase.
 */
function toCamelValues<T extends Record<string, string>>(obj: T): T {
	const entries = Object.entries(obj).map(([key, value]) => [key, kebabToCamel(value)]);

	return Object.fromEntries(entries) as T;
}

/**
 * Takes reference data and makes it the correct format for radio buttons, selects etc.
 */
export function referenceDataToRadioOptions(type: { displayName: string; id: string }): {
	text: string;
	value: string;
	conditional?: Record<string, any>;
} {
	return {
		text: type.displayName,
		value: type.id
	};
}

export const SUB_TYPE_ERROR = 'Select the case subtype';

export const CASEWORK_AREAS_CAMEL = Object.freeze(toCamelValues(CASEWORK_AREAS_ID));
export const CASE_TYPES_CAMEL = Object.freeze(toCamelValues(CASE_TYPES_ID));

/**
 * Takes an array of options, and converts them into the right format for radio buttons,
 * taking a list of keys and adding conditional displays onto them, and optionally
 * a new "other" key at the end.
 */
export function generateConditionalOptions(
	rawData: { displayName: string; id: string }[],
	{ conditionalKeys = [], addOther = false }
) {
	const baseData = rawData.map(referenceDataToRadioOptions);

	for (const conditionalKey of conditionalKeys) {
		const keyToUpdate = baseData.find((item) => item.value === conditionalKey);
		if (!keyToUpdate) continue;

		keyToUpdate.conditional = {
			type: 'textarea',
			fieldName: 'text',
			question: '',
			inputClasses: 'govuk-!-width-one-half'
		};
	}

	if (addOther) {
		baseData.push({
			text: 'Other',
			value: 'other',
			conditional: {
				type: 'textarea',
				fieldName: 'text',
				question: '',
				inputClasses: 'govuk-!-width-one-half'
			}
		});
	}

	return baseData;
}

/**
 * Takes flat data points, and builds just parent options based on an injected relationship map
 */
export const getParentPageOptions = (
	allRealDataPoints: DataPoint[],
	groups: UIGroup[],
	groupRelationships: GroupRelationships
) => {
	const childIds = new Set(Object.values(groupRelationships).flat());

	const topLevelProcedures = allRealDataPoints.filter((dataPoint) => !childIds.has(dataPoint.id));

	return [...groups, ...topLevelProcedures].sort((a, b) => a.displayName.localeCompare(b.displayName));
};

/**
 * Creates a new child set of options based on a selected grouping id and a relationship map passed in
 */
export const getChildPageOptions = (
	selectedGroupId: string,
	allRealDataPoints: DataPoint[],
	groupRelationships: GroupRelationships
) => {
	const targetIds = groupRelationships[selectedGroupId];

	if (!targetIds) {
		return [];
	}

	return allRealDataPoints.filter((dataPoint) => targetIds.includes(dataPoint.id));
};
