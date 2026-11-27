import { ADMIN_PROCEDURES_ID, PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/index.ts';

export function isCaseOfficerAdminProcedure(procedure: {
	procedureTypeId?: unknown;
	adminProcedureType?: unknown;
}): boolean {
	return (
		procedure.procedureTypeId === PROCEDURES_ID.ADMIN_IN_HOUSE &&
		procedure.adminProcedureType === ADMIN_PROCEDURES_ID.CASE_OFFICER
	);
}
