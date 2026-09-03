import assert from 'node:assert';
import { describe, it } from 'node:test';
import { MapCache } from './map-cache.ts';

describe('MapCache', () => {
	it('should add entries with the current date', (ctx) => {
		const now = new Date('2025-01-30T00:00:00.000Z');
		ctx.mock.timers.enable({ apis: ['Date'], now });
		const cache = new MapCache(5);

		cache.set('id-1', true);

		assert.deepStrictEqual(cache.cache.get('id-1').updated, now);
	});
	it(`should return values that aren't expired`, (ctx) => {
		const now = new Date('2025-01-30T00:00:00.000Z');
		ctx.mock.timers.enable({ apis: ['Date'], now });
		const cache = new MapCache(5);
		cache.set('id-1', true);
		cache.set('id-2', 'value 2');

		assert.strictEqual(cache.get('id-1'), true);
		assert.strictEqual(cache.get('id-2'), 'value 2');
	});
	it(`should return undefined if no entry`, (ctx) => {
		const now = new Date('2025-01-30T00:00:00.000Z');
		ctx.mock.timers.enable({ apis: ['Date'], now });
		const cache = new MapCache(5);

		assert.strictEqual(cache.get('id-1'), undefined);
	});
	it(`should not return expired values`, (ctx) => {
		const now = new Date('2025-01-30T00:00:00.000Z');
		ctx.mock.timers.enable({ apis: ['Date'], now });
		const cache = new MapCache(5);
		cache.set('id-1', true);
		cache.set('id-2', 'value 2');

		assert.strictEqual(cache.get('id-1'), true);
		assert.strictEqual(cache.get('id-2'), 'value 2');

		// 5 minutes on, not yet expired
		ctx.mock.timers.setTime(new Date('2025-01-30T00:05:00.000Z').getTime());
		assert.strictEqual(cache.get('id-1'), true);
		assert.strictEqual(cache.get('id-2'), 'value 2');

		// 10 minutes on, now expired
		ctx.mock.timers.setTime(new Date('2025-01-30T00:10:00.000Z').getTime());
		assert.strictEqual(cache.get('id-1'), undefined);
		assert.strictEqual(cache.get('id-2'), undefined);
	});
});
