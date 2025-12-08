import type { CaseListFields } from './types.ts';
import { formatInTimeZone } from 'date-fns-tz';
import { booleanToYesNoValue } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

function formatValue(value: any) {
	if (typeof value === 'boolean') {
		return booleanToYesNoValue(value);
	}
	return value;
}

const NESTED_SECTIONS: (keyof CaseListFields)[] = ['Dates', 'Costs', 'Abeyance'];

/**
 * Takes raw case data and converts into UI usable data format.
 * Converts the nested nature of join tables into a flat object.
 */
export function caseToViewModel(caseRow: CaseListFields) {
	const mergedData: Record<string, any> = { ...caseRow };

	NESTED_SECTIONS.forEach((sectionKey) => {
		const nestedObject = mergedData[sectionKey];

		if (nestedObject && typeof nestedObject === 'object') {
			const cleanNested = { ...nestedObject };

			// We do this instead of destructuring above because otherwise linter complains
			// that we never use 'id'.
			if ('id' in cleanNested) {
				delete cleanNested.id;
			}

			Object.assign(mergedData, cleanNested);

			delete mergedData[sectionKey];
		}
	});

	const sanitisedData: Record<string, any> = {};

	for (const key in mergedData) {
		sanitisedData[key] = formatValue(mergedData[key]);
	}

	return {
		...sanitisedData,
		receivedDateDisplay: formatInTimeZone(caseRow.receivedDate, 'Europe/London', 'dd MMM yyyy'),
		receivedDateSortable: new Date(caseRow.receivedDate)?.getTime()
	};
}
