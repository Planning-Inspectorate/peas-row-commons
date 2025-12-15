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
