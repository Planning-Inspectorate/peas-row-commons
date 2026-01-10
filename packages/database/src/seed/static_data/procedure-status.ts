import { PROCEDURE_STATUS_ID } from './ids/index.ts';

export const PROCEDURE_STATUSES = [
	{
		id: PROCEDURE_STATUS_ID.ACTIVE,
		displayName: 'Active'
	},
	{
		id: PROCEDURE_STATUS_ID.CANCELLED,
		displayName: 'Cancelled'
	},
	{
		id: PROCEDURE_STATUS_ID.CHANGED_PROCEDURE_TYPE,
		displayName: 'Changed procedure type'
	},
	{
		id: PROCEDURE_STATUS_ID.COMPLETED,
		displayName: 'Completed'
	},
	{
		id: PROCEDURE_STATUS_ID.FALLEN_AWAY,
		displayName: 'Fallen away'
	},
	{
		id: PROCEDURE_STATUS_ID.WITHDRAWN,
		displayName: 'Withdrawn'
	}
];
