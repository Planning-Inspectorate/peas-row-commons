import { CASE_STATUS_ID } from './ids/index.ts';

export const CASE_STATUSES = [
	{
		id: CASE_STATUS_ID.NEW_CASE,
		displayName: 'New case'
	},
	{
		id: CASE_STATUS_ID.VALIDATED,
		displayName: 'Validated'
	},
	{
		id: CASE_STATUS_ID.INVALID,
		displayName: 'Invalid'
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
		id: CASE_STATUS_ID.INFORM_PARTIES,
		displayName: 'Inform parties'
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
		id: CASE_STATUS_ID.IN_PROGRESS,
		displayName: 'In progress'
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
		id: CASE_STATUS_ID.EVENT,
		displayName: 'Event'
	},
	{
		id: CASE_STATUS_ID.DECISION_RECOMMENDATION_ISSUED,
		displayName: 'Decision/recommendation issued'
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
	},
	{
		id: CASE_STATUS_ID.CANCELLED,
		displayName: 'Cancelled'
	},
	{
		id: CASE_STATUS_ID.PAUSED_ON_HOLD,
		displayName: 'Paused/on hold'
	},
	{
		id: CASE_STATUS_ID.WITHDRAWN,
		displayName: 'Withdrawn'
	},
	{
		id: CASE_STATUS_ID.IN_ABEYANCE,
		displayName: 'In abeyance'
	},
	{
		id: CASE_STATUS_ID.CLOSED_OPENED_IN_ERROR,
		displayName: 'Closed - opened in error'
	}
];
