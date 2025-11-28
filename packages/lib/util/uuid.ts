/**
 * validates that a UUID is in the correct format as defined
 * by the regex. It is case insensitive.
 */
export function isValidUuidFormat(str: string) {
	return Boolean(str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
}
