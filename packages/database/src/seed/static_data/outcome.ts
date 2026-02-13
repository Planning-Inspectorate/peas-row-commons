import { OUTCOME_ID } from './ids/index.ts';

export const OUTCOMES = [
	{
		id: OUTCOME_ID.ALLOW,
		displayName: 'Allow'
	},
	{
		id: OUTCOME_ID.NOT_ALLOWED,
		displayName: 'Not allowed'
	},
	{
		id: OUTCOME_ID.PARTIALLY_ALLOW,
		displayName: 'Partially allow'
	},
	{
		id: OUTCOME_ID.CONFIRMED,
		displayName: 'Confirmed'
	},
	{
		id: OUTCOME_ID.NOT_CONFIRMED,
		displayName: 'Not confirmed'
	},
	{
		id: OUTCOME_ID.CONFIRMED_WITH_MODIFICATIONS,
		displayName: 'Confirmed with modifications'
	},
	{
		id: OUTCOME_ID.DIRECTED,
		displayName: 'Directed'
	},
	{
		id: OUTCOME_ID.NOT_DIRECTED,
		displayName: 'Not directed'
	},
	{
		id: OUTCOME_ID.GRANTED_WITH_CONDITIONS,
		displayName: 'Granted with conditions'
	},
	{
		id: OUTCOME_ID.GRANTED_WITHOUT_CONDITIONS,
		displayName: 'Granted without conditions'
	},
	{
		id: OUTCOME_ID.NOT_GRANTED,
		displayName: 'Not granted'
	},
	{
		id: OUTCOME_ID.MODIFIED_ADV,
		displayName: 'Modified (Adv)'
	},
	{
		id: OUTCOME_ID.MODIFIED_NOT_ADV,
		displayName: 'Modified (Not adv)'
	},
	{
		id: OUTCOME_ID.ORDER_MADE,
		displayName: 'Order made'
	},
	{
		id: OUTCOME_ID.ORDER_NOT_MADE,
		displayName: 'Order not made'
	},
	{
		id: OUTCOME_ID.ORDER_MADE_WITH_MODIFICATIONS,
		displayName: 'Order made with modifications'
	},
	{
		id: OUTCOME_ID.PROPOSE_TO_CONFIRM,
		displayName: 'Propose to confirm'
	},
	{
		id: OUTCOME_ID.PROPOSE_NOT_TO_CONFIRM,
		displayName: 'Propose not to confirm'
	},
	{
		id: OUTCOME_ID.OTHER,
		displayName: 'Other'
	}
];
