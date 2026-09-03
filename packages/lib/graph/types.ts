import type { Session } from 'express-session';
import type { CachedEntraClient } from './cached-entra-client.ts';

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
