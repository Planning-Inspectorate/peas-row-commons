export const NOTE_TYPE_ID = {
	CASE_NOTE: 'case-note',
	STICKY_NOTE: 'sticky-note',
	IMPORTANT_INFO: 'important-info'
} as const;

export const { CASE_NOTE, STICKY_NOTE, IMPORTANT_INFO } = NOTE_TYPE_ID;
