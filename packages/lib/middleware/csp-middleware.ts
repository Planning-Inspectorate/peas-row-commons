import type { Handler } from 'express';
import helmet from 'helmet';
import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// not directly exported from helmet types??
type LocalsResponse = ServerResponse & {
	locals?: any;
};
type ContentSecurityPolicyDirectiveValueFunction = (req: IncomingMessage, res: LocalsResponse) => string;
type ContentSecurityPolicyDirectiveValue = string | ContentSecurityPolicyDirectiveValueFunction;
export type HelmetCspDirectives = Record<string, null | Iterable<ContentSecurityPolicyDirectiveValue>>;

export function initContentSecurityPolicyMiddlewares(directives: HelmetCspDirectives): Handler[] {
	const middlewares: Handler[] = [];

	// Generate the nonce for each request
	middlewares.push((req, res, next) => {
		res.locals.cspNonce = crypto.randomBytes(32).toString('hex');
		next();
	});

	// Secure apps by setting various HTTP headers
	middlewares.push(helmet());

	middlewares.push(
		helmet.contentSecurityPolicy({
			directives
		})
	);

	return middlewares;
}
