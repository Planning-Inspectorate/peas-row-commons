/**
 * Get a required string value from an object
 * Throws if missing or not a string
 */
export function getStringParam(obj: Record<string, unknown> | undefined, key: string): string {
	const value = obj?.[key];
	if (typeof value !== 'string') {
		throw new Error(`${key} must be a single string value`);
	}
	return value;
}

/**
 * Get multiple required string values from an object
 */
export function getStringParams<K extends string>(
	obj: Record<string, unknown> | undefined,
	keys: K[]
): Record<K, string> {
	const result = {} as Record<K, string>;
	for (const key of keys) {
		result[key] = getStringParam(obj, key);
	}
	return result;
}

/**
 * Get an optional string value from an object
 * Returns null if missing, throws if present but not a string
 */
export function getOptionalStringParam(obj: Record<string, unknown> | undefined, key: string): string | null {
	if (!obj) return null;
	const value = obj[key];
	if (value === undefined || value === null) return null;
	if (typeof value !== 'string') {
		throw new Error(`${key} must be a single string value`);
	}
	return value;
}

/**
 * Get multiple optional string values from an object
 */
export function getOptionalStringParams<K extends string>(
	obj: Record<string, unknown> | undefined,
	keys: K[]
): Record<K, string | null> {
	const result = {} as Record<K, string | null>;
	for (const key of keys) {
		result[key] = getOptionalStringParam(obj, key);
	}
	return result;
}
