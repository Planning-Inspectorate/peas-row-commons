import cookieParser from 'cookie-parser';
import express from 'express';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { describe, it } from 'node:test';
import { TestServer } from './test-server.ts';

// Basic express app for testing
function createApp() {
	const app = express();
	app.use(express.json());
	app.use(cookieParser());

	app.get('/hello', (req, res) => {
		res.send('world');
	});

	app.post('/echo', (req, res) => {
		res.json(req.body);
	});

	app.get('/set-cookie', (req, res) => {
		res.cookie('foo', 'bar');
		res.send('cookie set');
	});

	app.get('/check-cookie', (req, res) => {
		const foo = req.cookies ? req.cookies.foo : undefined;
		res.json({ foo });
	});

	return app;
}

async function newTestServer(ctx: TestContext): Promise<TestServer> {
	const server = new TestServer(createApp());
	await server.start();
	ctx.after(async () => await server.stop());
	return server;
}

describe('TestServer', () => {
	it('should GET /hello', async (ctx) => {
		const server = await newTestServer(ctx);
		const res = await server.get('/hello');
		assert.equal(res.status, 200);
		const text = await res.text();
		assert.equal(text, 'world');
	});

	it('should POST /echo', async (ctx) => {
		const server = await newTestServer(ctx);
		const payload = { foo: 'bar' };
		const res = await server.post('/echo', payload);
		assert.equal(res.status, 200);
		const json = await res.json();
		assert.deepEqual(json, payload);
	});

	it('should handle cookies', async (ctx) => {
		const server = await newTestServer(ctx);
		server.rememberCookies = true;
		// Set cookie
		let res = await server.get('/set-cookie');
		assert.equal(res.status, 200);
		// Now check cookie is sent back
		res = await server.get('/check-cookie');
		assert.equal(res.status, 200);
		const json = await res.json();
		assert.equal(json.foo, 'bar');
	});
});
