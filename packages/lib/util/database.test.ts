// @ts-nocheck
import { describe, it } from 'node:test';
import { optionalWhere, wrapPrismaError } from './database.ts';
import assert from 'node:assert';
import { Prisma } from '@pins/peas-row-commons-database/src/client/client.ts';
import { mockLogger } from '../testing/mock-logger.ts';

describe('database', () => {
	describe('optionalWhere', () => {
		it('should return undefined if no id', () => {
			const result = optionalWhere();
			assert.strictEqual(result, undefined);
		});
		it('should return where clause if id', () => {
			const result = optionalWhere('id-1');
			assert.deepStrictEqual(result, { id: 'id-1' });
		});
	});
	describe('wrapPrismaError', () => {
		it('should re-throw non-Prisma errors', () => {
			const error = new Error('Some other error');
			const logger = mockLogger();
			assert.throws(
				() =>
					wrapPrismaError({
						error,
						logger,
						message: 'updating case'
					}),
				(err) => {
					assert.strictEqual(err, error);
					assert.strictEqual(err.name, 'Error');
					return true;
				}
			);
		});
		it('should not throw Prisma client errors', () => {
			const error = new Prisma.PrismaClientKnownRequestError('E101', {
				code: '123'
			});
			const logger = mockLogger();
			assert.throws(
				() =>
					wrapPrismaError({
						error,
						logger,
						message: 'updating case'
					}),
				(err) => {
					assert.strictEqual(err instanceof Prisma.PrismaClientKnownRequestError, false);
					assert.strictEqual(err.name, 'Error');
					assert.match(err.message, /Error updating case/);
					assert.match(err.message, /\(123\)/);
					return true;
				}
			);
		});
		it('should not throw Prisma validation errors', () => {
			const error = new Prisma.PrismaClientValidationError('E101', {});
			const logger = mockLogger();
			assert.throws(
				() =>
					wrapPrismaError({
						error,
						logger,
						message: 'updating case'
					}),
				(err) => {
					assert.strictEqual(err instanceof Prisma.PrismaClientValidationError, false);
					assert.strictEqual(err.name, 'Error');
					assert.match(err.message, /Error updating case/);
					return true;
				}
			);
		});
	});
});
