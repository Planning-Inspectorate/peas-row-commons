import type { TableSortPreference } from '@pins/peas-row-commons-lib/util/sort-queries.ts';
import 'express-session';

type DynamicSessionData = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO HRP-709 session data typing
	[key: string]: Record<string, any>;
};

declare module 'express-session' {
	interface SessionData extends DynamicSessionData {
		permissions?: Record<string, boolean>;
		tableSorts?: Partial<Record<string, TableSortPreference>>;
	}
}
