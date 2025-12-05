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
