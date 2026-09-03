import type { NextFunction, Request, Response } from 'express';

export function cacheNoStoreMiddleware(req: Request, res: Response, next: NextFunction) {
	res.set('Cache-Control', 'no-store');
	next();
}

export function cacheNoCacheMiddleware(req: Request, res: Response, next: NextFunction) {
	res.set('Cache-Control', 'no-cache');
	next();
}
