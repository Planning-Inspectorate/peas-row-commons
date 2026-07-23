/**
 * Type guard that narrows a value to exclude null and undefined.
 * Useful for filtering arrays or conditional checks.
 * @param value - The value to check
 * @returns True if the value is neither null nor undefined
 * @example const items = ['a', null, 'b', undefined];
 * const filtered = items.filter(isDefined); // string[]
 */
export const isDefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;
