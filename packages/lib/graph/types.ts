import { CachedEntraClient } from './cached-entra-client.ts';
import type { Session } from 'express-session';

export interface GroupMember {
	id: string;
	displayName: string;
}

export type AuthSession = Session & {
	account?: {
		accessToken?: string;
	};
};

export type InitEntraClient = (session: AuthSession) => CachedEntraClient | null;
