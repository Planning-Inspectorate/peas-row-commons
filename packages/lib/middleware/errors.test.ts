// @ts-nocheck
import { test, describe, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildDefaultErrorHandlerMiddleware, notFoundHandler, wrapPrismaErrors } from './errors.ts';
import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';

describe('errors', () => {
	describe('buildDefaultErrorHandlerMiddleware', () => {
		test('uses error status code', () => {
			const logger = {
				error: mock.fn()
			};
			const handler = buildDefaultErrorHandlerMiddleware(logger);
			const err = {
				statusCode: 502
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};

			handler(err, {}, res, () => {});
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.deepStrictEqual(res.status.mock.calls[0].arguments, [err.statusCode]);
		});
		test('ignores invalid status codes', () => {
			const logger = {
				error: mock.fn()
			};
			const handler = buildDefaultErrorHandlerMiddleware(logger);
			const err = {
				statusCode: -1
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};

			handler(err, {}, res, () => {});
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.deepStrictEqual(res.status.mock.calls[0].arguments, [500]);
		});
	});
	describe('wrapPrismaErrors', () => {
		test('ignores non-prisma errors', () => {
			const error = new Error('Some error');
			const wrapped = wrapPrismaErrors(error);
			assert.strictEqual(error, wrapped);
		});
		test('wraps known request errors', () => {
			const error = new Prisma.PrismaClientKnownRequestError('Known error', {
				code: 'Code101'
			});
			const wrapped = wrapPrismaErrors(error);
			assert.notStrictEqual(error, wrapped);
			assert.strictEqual(wrapped.message.startsWith('Request could not be handled'), true);
			assert.strictEqual(wrapped.message.endsWith('(code: Code101)'), true);
		});
		test('wraps unknown request errors', () => {
			const error = new Prisma.PrismaClientUnknownRequestError('Unknown error', {});
			const wrapped = wrapPrismaErrors(error);
			assert.notStrictEqual(error, wrapped);
			assert.strictEqual(wrapped.message.startsWith('Request could not be handled'), true);
			assert.strictEqual(wrapped.message.endsWith('(code: unknown)'), true);
		});
		test('wraps validation errors', () => {
			const error = new Prisma.PrismaClientValidationError('Validation error', {});
			const wrapped = wrapPrismaErrors(error);
			assert.notStrictEqual(error, wrapped);
			assert.strictEqual(wrapped.message.startsWith('Request could not be handled'), true);
			assert.strictEqual(wrapped.message.endsWith('(code: validation)'), true);
		});
		test('wraps initialisation errors', () => {
			const error = new Prisma.PrismaClientInitializationError('Init error', '');
			const wrapped = wrapPrismaErrors(error);
			assert.notStrictEqual(error, wrapped);
			assert.strictEqual(wrapped.message.startsWith('Connection error'), true);
			assert.strictEqual(wrapped.message.endsWith('(code: unknown)'), true);
		});
		test('wraps initialisation errors and includes errorCode', () => {
			const error = new Prisma.PrismaClientInitializationError('Init error', '', 'InitCode1');
			const wrapped = wrapPrismaErrors(error);
			assert.notStrictEqual(error, wrapped);
			assert.strictEqual(wrapped.message.startsWith('Connection error'), true);
			assert.strictEqual(wrapped.message.endsWith('(code: InitCode1)'), true);
		});
		test('wraps initialisation errors and add P1001 error code', () => {
			const error = new Prisma.PrismaClientInitializationError(`Can't reach database server at localhost:1433`, '');
			const wrapped = wrapPrismaErrors(error);
			assert.notStrictEqual(error, wrapped);
			assert.strictEqual(wrapped.message.startsWith('Connection error'), true);
			assert.strictEqual(wrapped.message.endsWith('(code: P1001)'), true);
		});
	});
	describe('notFound', () => {
		test('returns 404', () => {
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};

			notFoundHandler({}, res);
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.deepStrictEqual(res.status.mock.calls[0].arguments, [404]);
			const renderArgs = res.render.mock.calls[0].arguments;
			assert.strictEqual(renderArgs[0], 'views/layouts/error');
		});
	});
});
