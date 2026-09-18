import type { EntraGroupMembers } from '#util/entra-groups-types.ts';
import type { Request } from 'express';

// Shape of the "other cases" list used for the lead case reference options.
export interface OtherCaseOption {
	id: string;
	reference: string;
}

// Request augmented by buildGetJourneyMiddleware. We stash these on req
// because the dynamic-forms getJourney callback doesn't have access to res.
export interface CreateCaseRequest extends Request {
	groupMembers?: EntraGroupMembers;
	otherCases?: OtherCaseOption[];
}

export interface DataPoint {
	id: string;
	displayName: string;
}

export interface UIGroup {
	id: string;
	displayName: string;
}

export interface GroupRelationships {
	[groupId: string]: string[];
}
