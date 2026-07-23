import { PROCEDURE_EVENT_FORMAT_ID } from './ids/index.ts';

export const PROCEDURE_EVENT_FORMATS = [
	{
		id: PROCEDURE_EVENT_FORMAT_ID.FACE_TO_FACE,
		displayName: 'Face to face'
	},
	{
		id: PROCEDURE_EVENT_FORMAT_ID.VIRTUAL,
		displayName: 'Virtual'
	},
	{
		id: PROCEDURE_EVENT_FORMAT_ID.HYBRID,
		displayName: 'Hybrid'
	}
];
