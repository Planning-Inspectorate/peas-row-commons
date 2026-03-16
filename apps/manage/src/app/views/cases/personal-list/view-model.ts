import type { CaseOfficer } from '../view/types.ts';
import type { CaseListFields } from './types.ts';

/**
 * Builds the view model for the personal list page, mainly needed for mapping the users of inspectors
 * and case officers to their display names
 */
export function casesToViewModel(cases: CaseListFields[], groupMembers: { caseOfficers: CaseOfficer[] }) {
	const allUsers = groupMembers.caseOfficers || [];

	return cases.map((caseRow) => {
		const caseOfficerId = caseRow.CaseOfficer?.idpUserId;
		const mappedCaseOfficer = allUsers.find((user) => user.id === caseOfficerId);

		const mappedInspectors = caseRow.Inspectors.map((insp) => {
			const inspectorId = insp.Inspector?.idpUserId;
			const mappedInspector = allUsers.find((user) => user.id === inspectorId);

			// Attempts to find the user in entra, otherwise falls back to plain text 'idpUserId' then finally just 'Unknown'
			const userName = mappedInspector?.displayName || inspectorId || 'Unknown';

			return {
				displayName: userName
			};
		});

		return {
			...caseRow,
			caseOfficerName: mappedCaseOfficer?.displayName || caseOfficerId,
			mappedInspectors: mappedInspectors
		};
	});
}
