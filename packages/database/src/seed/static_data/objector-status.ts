import { OBJECTOR_STATUS_ID } from './ids/index.ts';

export const OBJECTOR_STATUSES = [
	{
		id: OBJECTOR_STATUS_ID.ADMISSIBLE,
		displayName: 'Admissible'
	},
	{
		id: OBJECTOR_STATUS_ID.INADMISSIBLE,
		displayName: 'Inadmissible'
	},
	{
		id: OBJECTOR_STATUS_ID.UPHELD,
		displayName: 'Upheld'
	},
	{
		id: OBJECTOR_STATUS_ID.WITHDRAWN,
		displayName: 'Withdrawn'
	},
	{
		id: OBJECTOR_STATUS_ID.NA,
		displayName: 'Not applicable'
	}
];
