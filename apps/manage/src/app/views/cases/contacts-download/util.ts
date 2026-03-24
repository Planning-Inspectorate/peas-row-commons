/**
 * Checks whether a case has any contacts (objectors, applicants/appellants,
 * or generic contacts) based on the journey response answers.
 *
 * Used to conditionally show the "Download all contacts" button
 * on the case details page.
 */
export function hasAnyContacts(answers: Record<string, unknown>): boolean {
	const objectors = answers?.objectorDetails;
	const contacts = answers?.contactDetails;
	const applicants = answers?.applicantDetails;

	return (
		(Array.isArray(objectors) && objectors.length > 0) ||
		(Array.isArray(contacts) && contacts.length > 0) ||
		(Array.isArray(applicants) && applicants.length > 0)
	);
}
