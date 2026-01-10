import ConditionalOptionsQuestion from './conditional-text-input/question.ts';
import FencingPermanentQuestion from './fencing-permanent/question.ts';
import OptionalTimeDateTimeInput from './optional-time-date-time-input/question.ts';

export const CUSTOM_COMPONENTS = Object.freeze({
	CONDITIONAL_TEXT_OPTIONS: 'conditional-text-options',
	FENCING_PERMANENT: 'fencing-permanent',
	OPTIONAL_TIME_DATE_TIME: 'optional-time-date-time'
});

export const CUSTOM_COMPONENT_CLASSES = Object.freeze({
	[CUSTOM_COMPONENTS.CONDITIONAL_TEXT_OPTIONS]: ConditionalOptionsQuestion,
	[CUSTOM_COMPONENTS.FENCING_PERMANENT]: FencingPermanentQuestion,
	[CUSTOM_COMPONENTS.OPTIONAL_TIME_DATE_TIME]: OptionalTimeDateTimeInput
});
