import { AUTHORITY_STATUS_ID } from './ids/authority-status.ts';

export const AUTHORITY_STATUSES = [
	{
		id: AUTHORITY_STATUS_ID.LIVE,
		displayName: 'Live'
	},
	{
		id: AUTHORITY_STATUS_ID.INVALID,
		displayName: 'Not yet live / created in error'
	},
	{
		id: AUTHORITY_STATUS_ID.TERMINATED,
		displayName: 'Terminated'
	},
	{
		id: AUTHORITY_STATUS_ID.UNKNOWN,
		displayName: 'Unknown / needs verifying'
	}
];
