/**
 * Converts string to float, or null if empty
 */
export function toFloat(str: string) {
	if (str) {
		return parseFloat(str);
	}
	return null;
}
