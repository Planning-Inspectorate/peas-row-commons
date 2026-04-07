import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/status.ts';

export const CLOSED_STATUSES = [
	CASE_STATUS_ID.CLOSED_OPENED_IN_ERROR,
	CASE_STATUS_ID.INVALID,
	CASE_STATUS_ID.WITHDRAWN,
	CASE_STATUS_ID.REJECTED,
	CASE_STATUS_ID.CANCELLED,
	CASE_STATUS_ID.CLOSED
] as const;
