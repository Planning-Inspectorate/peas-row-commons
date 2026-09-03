import type { QuestionProps } from '@planning-inspectorate/dynamic-forms';
import type { LegacyRadioQuestionProps } from './radio-with-legacy-options/question.ts';
import type { LegacySelectQuestionProps } from './select-with-legacy-options/question.ts';
import type { TableManageListQuestionProps } from './manage-list-table/question.ts';
import type { LinkedCasesListQuestionProps } from './manage-list-table/linked-cases-table/question.ts';
import type { DefinedColumnsTableQuestionProps } from './manage-list-table/defined-columns-list-table/question.ts';
import type { OutcomesTableQuestionProps } from './manage-list-table/defined-columns-list-table/outcomes-table/question.ts';
import type { ConditionalOptionsQuestionProps } from './conditional-text-input/question.ts';
import type { FencingPermanentQuestionProps } from './fencing-permanent/question.ts';
import type { AddressWithIdQuestionProps } from './address-with-id/question.ts';
import type { BooleanWithExtraActionsProps } from './boolean-with-extra-actions/question.ts';
import type { DatePeriodWithExtraActionsProps } from './date-period-with-extra-actions/question.ts';
import type { OptionalTimeDateTimeQuestionProps } from './optional-time-date-time-input/question.ts';
import type { NestedFolderQuestionProps } from './nested-folder-radio/question.ts';

export type {
	LegacyRadioQuestionProps,
	LegacySelectQuestionProps,
	TableManageListQuestionProps,
	LinkedCasesListQuestionProps,
	DefinedColumnsTableQuestionProps,
	OutcomesTableQuestionProps,
	ConditionalOptionsQuestionProps,
	FencingPermanentQuestionProps,
	AddressWithIdQuestionProps,
	BooleanWithExtraActionsProps,
	DatePeriodWithExtraActionsProps,
	OptionalTimeDateTimeQuestionProps,
	NestedFolderQuestionProps
};

/**
 * Union of every question props shape provided by our custom components.
 */
export type CustomComponentQuestionProps =
	| LegacyRadioQuestionProps
	| LegacySelectQuestionProps
	| TableManageListQuestionProps
	| LinkedCasesListQuestionProps
	| DefinedColumnsTableQuestionProps
	| OutcomesTableQuestionProps
	| ConditionalOptionsQuestionProps
	| FencingPermanentQuestionProps
	| AddressWithIdQuestionProps
	| BooleanWithExtraActionsProps
	| DatePeriodWithExtraActionsProps
	| OptionalTimeDateTimeQuestionProps
	| NestedFolderQuestionProps;

/**
 * Extended QuestionProps type for this project. Use this in place of the base
 * `QuestionProps` from `@planning-inspectorate/dynamic-forms` when defining
 * question config objects that may use any of our custom components, e.g:
 *
 * ```ts
 * export const MY_QUESTIONS = {
 *   ...
 * } satisfies Record<string, MpescQuestionProps>;
 * ```
 */
export type MpescQuestionProps = QuestionProps | CustomComponentQuestionProps;
