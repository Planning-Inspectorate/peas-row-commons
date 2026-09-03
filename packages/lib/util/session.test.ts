import assert from 'node:assert';
import { describe, it } from 'node:test';
import { addSessionData, clearSessionData, readSessionData } from './session.ts';

describe('session', () => {
	describe('addSessionData', () => {
		it('should throw if no session', () => {
			const req = {};
			assert.throws(() => addSessionData(req, 'id', {}));
		});
		it('should add session data', () => {
			const req = { session: {} };
			addSessionData(req, 'id', { data: '1', d: 2 });
			assert.deepStrictEqual(req.session, {
				cases: {
					id: {
						data: '1',
						d: 2
					}
				}
			});
		});
	});
	describe('readSessionData', () => {
		it('should return false if no session', () => {
			const req = {};
			const data = readSessionData(req, 'id', 'data', 'default');
			assert.strictEqual(data, false);
		});
		it('should return session data', () => {
			const req = { session: { cases: { id: { data: '1', d: 2 } } } };
			const data = readSessionData(req, 'id', 'data', 'default');
			assert.deepStrictEqual(data, '1');
		});
		it('should return default if no data', () => {
			const req = { session: { cases: { id: { data: '1', d: 2 } } } };
			const data = readSessionData(req, 'id2', 'data', 'default');
			assert.deepStrictEqual(data, 'default');
		});
	});
	describe('clearSessionData', () => {
		it('should return if no session', () => {
			const req = {};
			clearSessionData(req, 'id', 'data');
			assert.deepStrictEqual(req, {});
		});
		it('should delete session data', () => {
			const req = { session: { cases: { id: { data: '1', d: 2 } } } };
			clearSessionData(req, 'id', 'data');
			assert.deepStrictEqual(req.session, {
				cases: {
					id: {
						d: 2
					}
				}
			});
		});
		it('should delete session data for all fieldOrFields specified in an array', () => {
			const req = { session: { cases: { id: { data: '1', moreData: '3', d: 2 } } } };
			clearSessionData(req, 'id', ['data', 'moreData']);
			assert.deepStrictEqual(req.session, {
				cases: {
					id: {
						d: 2
					}
				}
			});
		});
	});
});
