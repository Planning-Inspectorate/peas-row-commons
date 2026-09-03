import type { Request, RequestHandler } from 'express';
import session from 'express-session';
import type { RedisClient } from '../redis/redis-client.js';

const DEFAULT_SESSION_FIELD = 'cases';

interface InitSessionOptions {
	redis: RedisClient | null;
	secure: boolean;
	secret: string;
}

export function initSessionMiddleware({ redis, secure, secret }: InitSessionOptions): RequestHandler {
	let store;
	if (redis) {
		store = redis.store;
	} else {
		store = new session.MemoryStore();
	}

	return session({
		secret: secret,
		resave: false,
		saveUninitialized: false,
		store,
		unset: 'destroy',
		cookie: {
			secure,
			maxAge: 86_400_000
		}
	});
}

/**
 * Add data to a session, by id and field
 */
export function addSessionData(
	req: Request,
	id: string,
	data: Record<string, any>,
	sessionField: string = DEFAULT_SESSION_FIELD
) {
	if (!req.session) {
		throw new Error('request session required');
	}
	const field = req.session[sessionField] || (req.session[sessionField] = {});
	const fieldProps = field[id] || (field[id] = {});
	Object.assign(fieldProps, data);
}

/**
 * Read a value from the session
 */
export function readSessionData<T>(
	req: Request,
	id: string,
	field: string,
	defaultValue: T,
	sessionField: string = DEFAULT_SESSION_FIELD
): T | boolean {
	if (!req.session) {
		return false;
	}
	const fieldProps = (req.session[sessionField] && req.session[sessionField][id]) || {};
	return fieldProps[field] || defaultValue;
}

/**
 * Clear a case updated flag from the session
 */
export function clearSessionData(
	req: Request,
	id: string,
	fieldOrFields: string | string[],
	sessionField: string = DEFAULT_SESSION_FIELD
) {
	if (!req.session) {
		return; // no need to error here
	}
	if (fieldOrFields instanceof Array) {
		fieldOrFields.forEach((field) => {
			const fieldProps = (req.session[sessionField] && req.session[sessionField][id]) || {};
			delete fieldProps[field];
		});
		return;
	}

	const fieldProps = (req.session[sessionField] && req.session[sessionField][id]) || {};
	delete fieldProps[fieldOrFields];
}
