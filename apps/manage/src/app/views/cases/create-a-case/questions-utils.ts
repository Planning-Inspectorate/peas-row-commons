import { CASE_TYPES_ID, CASEWORK_AREAS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/index.ts';

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
		if (!baseData[conditionalKey]) continue;

		baseData[conditionalKey].conditional = {
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
