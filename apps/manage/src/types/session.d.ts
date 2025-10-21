import 'express-session';

type DynamicSessionData = {
	[key: string]: Record<string, any>;
};

declare module 'express-session' {
	interface SessionData extends DynamicSessionData {
		permissions?: Record<string, boolean>;
	}
}
