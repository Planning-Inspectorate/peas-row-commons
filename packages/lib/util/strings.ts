/**
 * Module for all utils strings related.
 */

/**
 * Takes a string and converts it to kebab-case
 */
export function stringToKebab(string: string): string {
	if (!string) return '';
	return string
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[\s_]+/g, '-')
		.toLowerCase();
}

/**
 * Check that answer string is under certain character length
 */
export function checkAnswerlength(value: string, errorMessage: string, pageLink: string, length = 150) {
	if (value?.length > length) {
		return {
			text: errorMessage,
			href: pageLink
		};
	}
}

/**
 * Checks if a provided string is not empty, returns an error ready object if it is empty.
 */
export function checkRequiredAnswer(value: string, errorMessage: string, pageLink: string) {
	if (typeof value === 'undefined' || value === '' || value === null) {
		return {
			text: errorMessage,
			href: pageLink
		};
	}
}
