export interface ToggleDocumentBody {
	caseId?: string;
	markReadToggle?: string;
	flagToggle?: string;
	returnUrl?: string;
}

export type ToggleType = 'read' | 'flag';

export interface ToggleDocumentPayload {
	idpUserId: string;
	caseId: string;
	documentId: string;
	toggleType: ToggleType;
}
