import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/procedures.ts';

/**
 * 2 artificial groups for procedures, not stored with seed data
 * because they are not real groups that we want touching DB.
 * Just for user experience in the UI regarding the view model.
 */
export const PROCEDURE_GROUP_IDS = {
	ADMIN: 'admin',
	SITE_VISIT: 'site-visit'
};

export const PROCEDURE_GROUPS = [
	{
		id: PROCEDURE_GROUP_IDS.ADMIN,
		displayName: 'Admin (in house)'
	},
	{
		id: PROCEDURE_GROUP_IDS.SITE_VISIT,
		displayName: 'Site visit'
	}
];

export const GROUP_RELATIONSHIPS = {
	[PROCEDURE_GROUP_IDS.ADMIN]: [PROCEDURES_ID.CASE_OFFICER, PROCEDURES_ID.INSPECTOR],
	[PROCEDURE_GROUP_IDS.SITE_VISIT]: [PROCEDURES_ID.ARSV, PROCEDURES_ID.ASV, PROCEDURES_ID.USV]
};
