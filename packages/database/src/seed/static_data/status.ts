import { CASE_STATUS_ID } from './ids/index.ts';

export const CASE_STATUSES = [
	{
		id: CASE_STATUS_ID.NEW_CASE,
		displayName: 'New case'
	},
	{
		id: CASE_STATUS_ID.INITIAL_CHECKS_VALIDATION,
		displayName: 'Initial checks / validation'
	},
	{
		id: CASE_STATUS_ID.REJECTED,
		displayName: 'Rejected'
	},
	{
		id: CASE_STATUS_ID.SEND_LETTER,
		displayName: 'Send letter'
	},
	{
		id: CASE_STATUS_ID.ALLOCATE_INSPECTOR,
		displayName: 'Allocate inspector'
	},
	{
		id: CASE_STATUS_ID.ARRANGE_EVENT,
		displayName: 'Arrange event'
	},
	{
		id: CASE_STATUS_ID.EXCHANGE_CORRESPONDENCE,
		displayName: 'Exchange correspondence'
	},
	{
		id: CASE_STATUS_ID.READY_FOR_INSPECTOR,
		displayName: 'Ready for inspector'
	},
	{
		id: CASE_STATUS_ID.CHECK_DECISION,
		displayName: 'Check decision'
	},
	{
		id: CASE_STATUS_ID.DESPATCH,
		displayName: 'Despatch'
	},
	{
		id: CASE_STATUS_ID.FINAL_CHECK,
		displayName: 'Final check'
	},
	{
		id: CASE_STATUS_ID.CLOSED,
		displayName: 'Closed'
	}
];
