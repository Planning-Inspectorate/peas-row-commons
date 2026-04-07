import { CLOSED_STATUSES } from '../constants/statuses.ts';

export type ContactMappingConfig = {
	sourceKey: string;
	prefix: string;
	fixedTypeId?: string;
	dynamicTypeField?: string;
	hasStatus?: boolean;
	deleteFilter: { contactTypeId: string | { notIn: string[] } };
};

export type AddressItem = {
	id?: string;
	addressLine1?: string;
	addressLine2?: string;
	townCity?: string;
	county?: string;
	postcode?: string;
};

export type DefaultStatusParams = {
	legacyCaseId: string | null;
	statusId: string | null;
	closedStatuses: typeof CLOSED_STATUSES;
};
