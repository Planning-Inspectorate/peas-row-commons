import { OBJECTOR_STATUS_ID } from './ids/index.ts';

export const OBJECTOR_STATUSES = [
	{
		id: OBJECTOR_STATUS_ID.ADMISSABLE,
		displayName: 'Admissable'
	},
	{
		id: OBJECTOR_STATUS_ID.UPHELD,
		displayName: 'Upheld'
	},
	{
		id: OBJECTOR_STATUS_ID.WITHDRAWN,
		displayName: 'Withdrawn'
	}
];
