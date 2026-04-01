import { AUDIT_ACTIONS } from '../../../apps/manage/src/app/audit/actions.ts';

export const LIST_FIELDS = new Set([
	'relatedCaseDetails',
	'linkedCaseDetails',
	'inspectorDetails',
	'applicantDetails',
	'objectorDetails',
	'contactDetails',
	'procedureDetails',
	'outcomeDetails'
]);

/**
 * Actions that support a collapsible file list in the details column.
 * When these actions have a `files` array in metadata, the details
 * will include a GOV.UK details component for show/hide.
 */
export const BULK_FILE_ACTIONS = new Set<string>([
	AUDIT_ACTIONS.FILES_UPLOADED,
	AUDIT_ACTIONS.FILES_DOWNLOADED,
	AUDIT_ACTIONS.FILES_DELETED
]);
