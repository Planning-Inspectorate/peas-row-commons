import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateCaseReference } from './case-reference.ts';

const mockDb = (reference: string | null) =>
	({
		case: {
			findFirst: async () => (reference ? { reference } : null)
		}
	}) as any;

describe('generateCaseReference', () => {
	describe('first manual case for a prefix', () => {
		it('should return 10001 when no manual cases exist', async () => {
			const db = mockDb(null);
			const result = await generateCaseReference(db, 'CPO/HOU/');
			assert.strictEqual(result, 'CPO/HOU/10001');
		});

		it('should return 10001 for Purchase Notice when no manual cases exist', async () => {
			const db = mockDb(null);
			const result = await generateCaseReference(db, 'PUR/');
			assert.strictEqual(result, 'PUR/10001');
		});
	});

	describe('incrementing from existing manual cases', () => {
		it('should increment from the latest manual case', async () => {
			const db = mockDb('CPO/HOU/10005');
			const result = await generateCaseReference(db, 'CPO/HOU/');
			assert.strictEqual(result, 'CPO/HOU/10006');
		});

		it('should increment for Purchase Notice cases', async () => {
			const db = mockDb('PUR/10003');
			const result = await generateCaseReference(db, 'PUR/');
			assert.strictEqual(result, 'PUR/10004');
		});
	});

	describe('prefix scoping', () => {
		it('should use the correct prefix for RoW cases with extended subtype codes', async () => {
			const db = mockDb(null);
			const result = await generateCaseReference(db, 'ROW/S14A/');
			assert.strictEqual(result, 'ROW/S14A/10001');
		});

		it('should use the correct prefix for DRO cases', async () => {
			const db = mockDb('DRO/ORD/10001');
			const result = await generateCaseReference(db, 'DRO/ORD/');
			assert.strictEqual(result, 'DRO/ORD/10002');
		});
	});

	describe('query filtering', () => {
		it('should pass startsWith and gte filters to the query', async () => {
			let capturedWhere: any = null;

			const db = {
				case: {
					findFirst: async (args: any) => {
						capturedWhere = args.where;
						return null;
					}
				}
			} as any;

			await generateCaseReference(db, 'CPO/HOU/');

			assert.strictEqual(capturedWhere.reference.startsWith, 'CPO/HOU/');
			assert.strictEqual(capturedWhere.reference.gte, 'CPO/HOU/10001');
		});
	});
});
