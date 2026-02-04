import ConditionalOptionsQuestion from './conditional-text-input/question.ts';
import FencingPermanentQuestion from './fencing-permanent/question.ts';
import TableManageListQuestion from './manage-list-table/question.ts';
import NestedFolderQuestion from './nested-folder-radio/question.ts';
import OptionalTimeDateTimeInput from './optional-time-date-time-input/question.ts';

export const CUSTOM_COMPONENTS = Object.freeze({
	CONDITIONAL_TEXT_OPTIONS: 'conditional-text-options',
	FENCING_PERMANENT: 'fencing-permanent',
	OPTIONAL_TIME_DATE_TIME: 'optional-time-date-time',
	TABLE_MANAGE_LIST: 'table-manage-list',
	NESTED_FOLDERS: 'nested-folders'
});

export const CUSTOM_COMPONENT_CLASSES = Object.freeze({
	[CUSTOM_COMPONENTS.CONDITIONAL_TEXT_OPTIONS]: ConditionalOptionsQuestion,
	[CUSTOM_COMPONENTS.FENCING_PERMANENT]: FencingPermanentQuestion,
	[CUSTOM_COMPONENTS.OPTIONAL_TIME_DATE_TIME]: OptionalTimeDateTimeInput,
	[CUSTOM_COMPONENTS.TABLE_MANAGE_LIST]: TableManageListQuestion,
	[CUSTOM_COMPONENTS.NESTED_FOLDERS]: NestedFolderQuestion
});
