import { strict as assert } from 'node:assert';
import { describe, test } from 'node:test';
import { parseRedisConnectionString } from './redis-client.ts';

describe('redis', () => {
	describe('parseRedisConnectionString', () => {
		const tests = [
			{
				name: 'empty string',
				str: '',
				want: {},
				error: true
			},
			{
				name: 'too few parts',
				str: 'some.example.org:6380,password=some_password,ssl=True',
				want: {},
				error: true
			},
			{
				name: 'too many parts',
				str: 'some.example.org:6380,password=some_password,ssl=True,abortConnect=False,extra=thing',
				want: {},
				error: true
			},
			{
				name: 'no port',
				str: 'some.example.org,password=some_password,ssl=True,abortConnect=False',
				want: {},
				error: true
			},
			{
				name: 'port not int',
				str: 'some.example.org:port,password=some_password,ssl=True,abortConnect=False',
				want: {},
				error: true
			},
			{
				name: 'invalid password part',
				str: 'some.example.org:port,password2=some_password,ssl=True,abortConnect=False',
				want: {},
				error: true
			},
			{
				name: 'valid config is parsed',
				str: 'some.example.org:1234,password=some_password,ssl=True,abortConnect=False',
				want: {
					host: 'some.example.org',
					port: 1234,
					password: 'some_password',
					ssl: true,
					abortConnect: false
				}
			},
			{
				name: 'case insentive for true/false',
				str: 'some.example.org:1234,password=some_password,ssl=true,abortConnect=FaLse',
				want: {
					host: 'some.example.org',
					port: 1234,
					password: 'some_password',
					ssl: true,
					abortConnect: false
				}
			}
		];
		for (const t of tests) {
			test(t.name, () => {
				if (t.error) {
					assert.throws(() => parseRedisConnectionString(t.str));
				} else {
					const got = parseRedisConnectionString(t.str);
					assert.deepStrictEqual(got, t.want);
				}
			});
		}
	});
});
