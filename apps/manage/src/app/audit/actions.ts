/**
 * Audit action definitions.
 *
 * Each action maps to a template string used to generate the human-readable
 * "Details" column in the case history table. Templates can include
 * placeholders like `{reference}` or `{fieldName}` which are resolved at
 * display time from the event's metadata.
 *
 * Grouping follows the case history scenarios document.
 */

export const AUDIT_ACTIONS = {
	// Case
	CASE_CREATED: 'CASE_CREATED',
	CASE_DOWNLOADED: 'CASE_DOWNLOADED',

	// Standard fields
	FIELD_SET: 'FIELD_SET',
	FIELD_UPDATED: 'FIELD_UPDATED',
	FIELD_CLEARED: 'FIELD_CLEARED',

	// Files
	FILE_UPLOADED: 'FILE_UPLOADED',
	FILES_UPLOADED: 'FILES_UPLOADED',
	FILE_DOWNLOADED: 'FILE_DOWNLOADED',
	FILES_DOWNLOADED: 'FILES_DOWNLOADED',
	FILE_MOVED: 'FILE_MOVED',
	FILE_DELETED: 'FILE_DELETED',
	FILES_DELETED: 'FILES_DELETED',

	// Folders
	FOLDER_CREATED: 'FOLDER_CREATED',
	FOLDER_DELETED: 'FOLDER_DELETED',
	FOLDER_RENAMED: 'FOLDER_RENAMED',

	// Case notes
	CASE_NOTE_ADDED: 'CASE_NOTE_ADDED',

	// Related cases
	RELATED_CASE_ADDED: 'RELATED_CASE_ADDED',
	RELATED_CASE_UPDATED: 'RELATED_CASE_UPDATED',
	RELATED_CASE_DELETED: 'RELATED_CASE_DELETED',

	// Linked cases
	LINKED_CASE_ADDED: 'LINKED_CASE_ADDED',
	LINKED_CASE_UPDATED: 'LINKED_CASE_UPDATED',
	LINKED_CASE_DELETED: 'LINKED_CASE_DELETED',

	// Applicant or appellant
	APPLICANT_ADDED: 'APPLICANT_ADDED',
	APPLICANT_UPDATED: 'APPLICANT_UPDATED',
	APPLICANT_DELETED: 'APPLICANT_DELETED',

	// Inspector
	INSPECTOR_ADDED: 'INSPECTOR_ADDED',
	INSPECTOR_UPDATED: 'INSPECTOR_UPDATED',
	INSPECTOR_DELETED: 'INSPECTOR_DELETED',

	// Objector
	OBJECTOR_ADDED: 'OBJECTOR_ADDED',
	OBJECTOR_UPDATED: 'OBJECTOR_UPDATED',
	OBJECTOR_DELETED: 'OBJECTOR_DELETED',

	// Contact
	CONTACT_ADDED: 'CONTACT_ADDED',
	CONTACT_UPDATED: 'CONTACT_UPDATED',
	CONTACT_DELETED: 'CONTACT_DELETED',

	// Procedure
	PROCEDURE_ADDED: 'PROCEDURE_ADDED',
	PROCEDURE_UPDATED: 'PROCEDURE_UPDATED',
	PROCEDURE_DELETED: 'PROCEDURE_DELETED',

	// Outcome
	OUTCOME_ADDED: 'OUTCOME_ADDED',
	OUTCOME_UPDATED: 'OUTCOME_UPDATED',
	OUTCOME_DELETED: 'OUTCOME_DELETED'
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Maps each action to the template shown in the "Details" column of the
 * case history table.
 *
 * Placeholders are resolved from the event's metadata at display time.
 * A dash `-` is used when there is no previous value (i.e. the field was empty).
 *
 * Metadata keys used across templates:
 *   {reference}      – case reference (e.g. DRT/PER/00015)
 *   {fieldName}      – display name of the field that changed
 *   {oldValue}       – previous value (use `-` if empty)
 *   {newValue}       – new value
 *   {fileName}       – name of a single file
 *   {folderName}     – name of a folder
 *   {oldFolderName}  – original folder name (for moves/renames)
 *   {newFolderName}  – new folder name (for moves/renames)
 *   {name}           – name of a person (inspector, contact, etc.)
 *   {entityName}     – original name of the entity for update context
 *   {caseNote}       – the case note text
 *   {zipName}        – name of the bulk download zip folder
 *   {procedureName}  – procedure type name (e.g. Hearing)
 *   {procedureStatus} – procedure status (e.g. active)
 *   {outcomeName}    – outcome type name (e.g. Proposal)
 */
export const AUDIT_TEMPLATES: Record<AuditAction, string> = {
	// Case
	[AUDIT_ACTIONS.CASE_CREATED]: '{reference} was created',
	[AUDIT_ACTIONS.CASE_DOWNLOADED]: 'Case downloaded',

	// Standard fields
	[AUDIT_ACTIONS.FIELD_SET]: '{fieldName} was set to {newValue}',
	[AUDIT_ACTIONS.FIELD_UPDATED]: '{fieldName} was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.FIELD_CLEARED]: '{fieldName} ({oldValue}) was removed',

	// Files – single
	[AUDIT_ACTIONS.FILE_UPLOADED]: '{fileName} was uploaded to {folderName}',
	[AUDIT_ACTIONS.FILE_DOWNLOADED]: '{fileName} was downloaded',
	[AUDIT_ACTIONS.FILE_MOVED]: '{fileName} was moved from {oldFolderName} to {newFolderName}',
	[AUDIT_ACTIONS.FILE_DELETED]: '{fileName} was removed',

	// Files – bulk (file list is stored in metadata.files and rendered by the frontend)
	[AUDIT_ACTIONS.FILES_UPLOADED]: 'Files were uploaded',
	[AUDIT_ACTIONS.FILES_DOWNLOADED]: 'Files were downloaded into zip folder: {zipName}',
	[AUDIT_ACTIONS.FILES_DELETED]: 'Files were removed',

	// Folders
	[AUDIT_ACTIONS.FOLDER_CREATED]: '{folderName} was created',
	[AUDIT_ACTIONS.FOLDER_DELETED]: '{folderName} was removed',
	[AUDIT_ACTIONS.FOLDER_RENAMED]: '{oldFolderName} was renamed from {oldFolderName} to {newFolderName}',

	// Case notes
	[AUDIT_ACTIONS.CASE_NOTE_ADDED]: 'Case note added:\n{caseNote}',

	// Related cases
	[AUDIT_ACTIONS.RELATED_CASE_ADDED]: '{reference} was added to related cases.',
	[AUDIT_ACTIONS.RELATED_CASE_UPDATED]: 'Related case reference was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.RELATED_CASE_DELETED]: '{reference} was deleted from related case(s).',

	// Linked cases
	[AUDIT_ACTIONS.LINKED_CASE_ADDED]: '{reference} was added to linked cases.',
	[AUDIT_ACTIONS.LINKED_CASE_UPDATED]:
		'Linked case reference ({entityName}) {fieldName} was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.LINKED_CASE_DELETED]: '{reference} was deleted from linked case(s).',

	// Applicant or appellant
	[AUDIT_ACTIONS.APPLICANT_ADDED]: '{name} was added to applicant or appellant(s).',
	[AUDIT_ACTIONS.APPLICANT_UPDATED]:
		'Applicant or appellant ({entityName}) {fieldName} was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.APPLICANT_DELETED]: '{name} was deleted from applicant or appellant(s).',

	// Inspector
	[AUDIT_ACTIONS.INSPECTOR_ADDED]: '{name} was added to inspector(s).',
	[AUDIT_ACTIONS.INSPECTOR_UPDATED]: 'Inspector ({entityName}) {fieldName} was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.INSPECTOR_DELETED]: '{name} was deleted from inspector(s).',

	// Objector
	[AUDIT_ACTIONS.OBJECTOR_ADDED]: '{name} was added to objector(s).',
	[AUDIT_ACTIONS.OBJECTOR_UPDATED]: 'Objector ({entityName}) {fieldName} was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.OBJECTOR_DELETED]: '{name} was deleted from objector(s).',

	// Contact
	[AUDIT_ACTIONS.CONTACT_ADDED]: '{name} was added to contact(s).',
	[AUDIT_ACTIONS.CONTACT_UPDATED]: 'Contact ({entityName}) {fieldName} was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.CONTACT_DELETED]: '{name} was deleted from contact(s).',

	// Procedure
	[AUDIT_ACTIONS.PROCEDURE_ADDED]: '{procedureName} was added to procedure(s).',
	[AUDIT_ACTIONS.PROCEDURE_UPDATED]:
		'Procedure ({procedureName}({procedureStatus})) {fieldName} was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.PROCEDURE_DELETED]:
		'{procedureName} was deleted from procedure(s). The associated fields have also been deleted.',

	// Outcome
	[AUDIT_ACTIONS.OUTCOME_ADDED]: '{outcomeName} was added to outcome(s).',
	[AUDIT_ACTIONS.OUTCOME_UPDATED]: 'Outcome ({outcomeName}) {fieldName} was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.OUTCOME_DELETED]: '{outcomeName} was deleted from outcome(s).'
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
