import { Prisma } from '@pins/peas-row-commons-database/src/client/client.js';

export const caseListSelect = {
	id: true,
	name: true,
	reference: true,
	receivedDate: true,
	Type: {
		select: { displayName: true }
	}
} satisfies Prisma.CaseSelect;

export type CaseListFields = Prisma.CaseGetPayload<{ select: typeof caseListSelect }>;

export interface CaseListViewModel {
	id: string;
	reference: string;
	receivedDate: string;
	name: string;
	Type: { displayName: string | null };
	receivedDateSortable: number;
}
