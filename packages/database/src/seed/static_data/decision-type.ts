import { DECISION_TYPE_ID } from './ids/index.ts';

export const DECISION_TYPES = [
	{
		id: DECISION_TYPE_ID.DECISION,
		displayName: 'Decision'
	},
	{
		id: DECISION_TYPE_ID.INTERIM_DECISION,
		displayName: 'Interim decision'
	},
	{
		id: DECISION_TYPE_ID.PROPOSAL,
		displayName: 'Proposal'
	},
	{
		id: DECISION_TYPE_ID.RECOMMENDATION,
		displayName: 'Recommendation'
	},
	{
		id: DECISION_TYPE_ID.REPORT,
		displayName: 'Report'
	}
];
