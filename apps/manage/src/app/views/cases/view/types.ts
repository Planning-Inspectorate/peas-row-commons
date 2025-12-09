import { Prisma } from '@pins/peas-row-commons-database/src/client/client.js';

export const caseListSelect = {
	id: true,
	name: true,
	reference: true,
	createdDate: true,
	updatedDate: true,
	receivedDate: true,
	applicant: true,
	authority: true,
	area: true,
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
	SiteAddress: {
		select: {
			line1: true,
			townCity: true,
			postcode: true
		}
	},
	Notes: true
} satisfies Prisma.CaseSelect;

export type CaseListFields = Prisma.CaseGetPayload<{ select: typeof caseListSelect }>;

export type CaseNoteFields = Prisma.CaseNoteGetPayload<{ select: Prisma.CaseNoteSelect }>;
