/**
 * Audit action definitions.
 *
 * Each action maps to a template string used to generate the human-readable
 * "Details" column in the case history table. Templates can include
 * placeholders like `{reference}` or `{fieldName}` which are resolved at
 * display time from the event's metadata.
 *
 * Grouping follows the ticket's description table:
 *   - Case-level actions
 *   - Standard field actions
 *   - File actions
 *   - Folder actions
 *   - Case note actions
 */

export const AUDIT_ACTIONS = {
	// Case
	CASE_CREATED: 'CASE_CREATED',

	// Standard fields
	FIELD_UPDATED: 'FIELD_UPDATED',

	// Files
	FILE_UPLOADED: 'FILE_UPLOADED',
	FILE_DELETED: 'FILE_DELETED',
	FILE_MOVED: 'FILE_MOVED',
	FILE_DOWNLOADED: 'FILE_DOWNLOADED',

	// Folders
	FOLDER_CREATED: 'FOLDER_CREATED',
	FOLDER_DELETED: 'FOLDER_DELETED',
	FOLDER_RENAMED: 'FOLDER_RENAMED',

	// Case notes
	CASE_NOTE_ADDED: 'CASE_NOTE_ADDED'
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Maps each action to the template shown in the "Details" column of the
 * case history table.
 *
 * Placeholders:
 *   {reference}  – case reference (e.g. DRT/PER/00015)
 *   {fieldName}  – display name of the field that changed
 *
 * These are intentionally simple for the initial implementation per the
 * ticket. HRP-296 will explore richer detail.
 */
export const AUDIT_TEMPLATES: Record<AuditAction, string> = {
	[AUDIT_ACTIONS.CASE_CREATED]: '{reference} was created',

	[AUDIT_ACTIONS.FIELD_UPDATED]: '{fieldName} was updated',

	[AUDIT_ACTIONS.FILE_UPLOADED]: 'Files were updated',
	[AUDIT_ACTIONS.FILE_DELETED]: 'Files were updated',
	[AUDIT_ACTIONS.FILE_MOVED]: 'Files were updated',
	[AUDIT_ACTIONS.FILE_DOWNLOADED]: 'File was downloaded',

	[AUDIT_ACTIONS.FOLDER_CREATED]: 'Folders were updated',
	[AUDIT_ACTIONS.FOLDER_DELETED]: 'Folders were updated',
	[AUDIT_ACTIONS.FOLDER_RENAMED]: 'Folders were updated',

	[AUDIT_ACTIONS.CASE_NOTE_ADDED]: 'Case notes were updated'
};

/**
 * Resolves a template string by replacing `{key}` placeholders with values
 * from the supplied metadata.
 *
 * Unknown placeholders are left as-is so they're visible during development.
 */
export function resolveTemplate(action: AuditAction, metadata?: Record<string, unknown>): string {
	const template = AUDIT_TEMPLATES[action];

	if (!metadata) {
		return template;
	}

	return template.replace(/\{(\w+)\}/g, (match, key) => {
		const value = metadata[key];
		return value !== undefined && value !== null ? String(value) : match;
	});
}
