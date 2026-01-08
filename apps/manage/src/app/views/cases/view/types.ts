import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';

export const caseListSelect = {
	id: true,
	name: true,
	reference: true,
	createdDate: true,
	updatedDate: true,
	receivedDate: true,
	location: true,
	caseOfficerId: true,
	procedureId: true,
	linkedCases: true,
	Dates: true,
	Costs: true,
	Abeyance: true,
	Type: {
		select: { displayName: true }
	},
	SubType: {
		select: { displayName: true }
	},
	SiteAddress: true,
	Notes: true,
	Applicant: true,
	Authority: true,
	Decision: true
} satisfies Prisma.CaseSelect;

export type CaseListFields = Prisma.CaseGetPayload<{ select: typeof caseListSelect }>;

export type CaseNoteFields = Prisma.CaseNoteGetPayload<{ select: Prisma.CaseNoteSelect }>;

export type CaseOfficer = {
	id: string;
	displayName: string;
};
