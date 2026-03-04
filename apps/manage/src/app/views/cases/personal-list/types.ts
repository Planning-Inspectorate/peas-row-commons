import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';

export const caseListSelect = {
	CaseOfficer: true,
	Inspectors: {
		select: {
			Inspector: true
		}
	},
	reference: true
} satisfies Prisma.CaseSelect;

export type CaseListFields = Prisma.CaseGetPayload<{ select: typeof caseListSelect }>;
