import { INVOICE_STATUSES_ID } from './ids/index.ts';

export const INVOICE_STATUSES = [
	{
		id: INVOICE_STATUSES_ID.YES,
		displayName: 'Yes'
	},
	{
		id: INVOICE_STATUSES_ID.NO,
		displayName: 'No'
	},
	{
		id: INVOICE_STATUSES_ID.INTERIM,
		displayName: 'Interim invoice sent'
	}
];
