export type Address = {
	line1: string;
	line2: string;
	town: string;
	county: string;
	postcode: string;
};

export type Contact = {
	email: string;
	phone: string;
};

export type ApplicantEntry = {
	firstName?: string;
	lastName?: string;
	orgName?: string;
	address?: Address;
	contact?: Contact;
};

export type CaseAnswers = {
	caseName?: string;
	externalReference?: string;
	receivedDate?: { day: string; month: string; year: string };
	applicants?: ApplicantEntry[];
	siteAddress?: Address;
	siteLocation?: string;
	authority?: string;
	caseOfficer?: string;
};

export const createAnswers = (): CaseAnswers => ({
	applicants: []
});
