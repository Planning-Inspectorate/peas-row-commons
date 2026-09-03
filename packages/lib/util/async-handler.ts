import type { RequestHandler } from 'express';
import type core from 'express-serve-static-core';

// an async handler type, since RequestHandler is sync and does not return a Promise
// adapted from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/8e274af6ed512811d15426cca3b946cd9227a255/types/express-serve-static-core/index.d.ts#L52-L65
export type AsyncRequestHandler<
	P = core.ParamsDictionary,
	ResBody = any,
	ReqBody = any,
	ReqQuery = core.Query,
	LocalsObj extends Record<string, any> = Record<string, any>
> = (
	req: core.Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
	res: core.Response<ResBody, LocalsObj>,
	next?: core.NextFunction
) => Promise<void>;

export function asyncHandler<A, B, C, D, E extends Record<string, any>>(
	// supports async or sync handlers
	requestHandler: RequestHandler<A, B, C, D, E> | AsyncRequestHandler<A, B, C, D, E>
): RequestHandler<A, B, C, D, E> {
	return (request, response, next) => {
		try {
			const p = requestHandler(request, response, next);
			if (p instanceof Promise) {
				p.catch(next);
			}
		} catch (e) {
			// in case a sync function is passed in
			next(e);
		}
	};
}
