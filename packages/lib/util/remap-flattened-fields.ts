/**
 * Remaps flattened field names back into their parent array.
 *
 * When a DynamicSectionBuilder clone is edited via a summary card "Change" link,
 * the form submits with a flattened fieldName like `<listFieldName>_<index>_<originalField>`.
 * Prisma doesn't recognise these flat keys, so we need to merge them back into the
 * existing array before the standard array handler (e.g. handleProcedureDetails) runs.
 */
export function remapFlattenedFieldsToArray(
	flatData: Record<string, unknown>,
	existingItems: Record<string, unknown>[],
	flatKeyPattern: RegExp,
	listFieldName: string
): void {
	const updates = new Map<number, Record<string, unknown>>();

	for (const key of Object.keys(flatData)) {
		const match = key.match(flatKeyPattern);
		if (!match) continue;

		const index = parseInt(match[1], 10);
		const originalFieldName = match[2];

		if (!updates.has(index)) {
			updates.set(index, {});
		}
		updates.get(index)![originalFieldName] = flatData[key];

		delete flatData[key];
	}

	if (updates.size === 0) return;

	const merged = [...existingItems];
	for (const [index, fields] of updates) {
		if (merged[index]) {
			merged[index] = { ...merged[index], ...fields };
		}
	}

	flatData[listFieldName] = merged;
}
