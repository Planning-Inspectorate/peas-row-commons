import { test, describe, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { UrlBuilder } from './url-builder.ts';

describe('url-builder', () => {
	let urlBuilder: any;

	beforeEach(() => {
		urlBuilder = new UrlBuilder('http://example.com');
	});

	test('should initialize with baseUrl', () => {
		assert.deepEqual(urlBuilder.baseUrl, 'http://example.com');
	});

	test('should attach a path segments correctly', () => {
		urlBuilder.addPathSegment('path1').addPathSegment('path2');
		assert.deepEqual(urlBuilder.pathSegments, ['path1', 'path2']);
	});

	test('should add query parameters correctly', () => {
		urlBuilder.addQueryParam('key1', 'value1').addQueryParam('key2', 'value2');
		assert.deepEqual(urlBuilder.queryParams.toString(), 'key1=value1&key2=value2');
	});

	test('should build URL with path segments and query parameters correctly', () => {
		urlBuilder.addPathSegment('path1').addPathSegment('path2');
		urlBuilder.addQueryParam('key1', 'value1').addQueryParam('key2', 'value2');
		const url = urlBuilder.toString();
		assert.deepEqual(url, 'http://example.com/path1/path2?key1=value1&key2=value2');
	});

	test('should be able to build with only path segments', () => {
		urlBuilder.addPathSegment('path1').addPathSegment('path2');
		const url = urlBuilder.toString();
		assert.deepEqual(url, 'http://example.com/path1/path2');
	});

	test('should be able to build with only query parameters', () => {
		urlBuilder.addQueryParam('key1', 'value1').addQueryParam('key2', 'value2');
		const url = urlBuilder.toString();
		assert.deepEqual(url, 'http://example.com?key1=value1&key2=value2');
	});

	test('should add multiple queries using add query params', () => {
		const queries = [
			['key1', 'value1'],
			['key2', 'value2']
		];
		urlBuilder.addQueryParams(queries);
		const url = urlBuilder.toString();
		assert.deepEqual(url, 'http://example.com?key1=value1&key2=value2');
	});

	test('should no multiple using add query params with an undefined value', () => {
		const queries = undefined;
		urlBuilder.addQueryParams(queries);
		const url = urlBuilder.toString();
		assert.deepEqual(url, 'http://example.com');
	});

	test('should be able to build with no path segments or query parameters', () => {
		const url = urlBuilder.toString();
		assert.deepEqual(url, 'http://example.com');
	});

	test('should return a string when calling toString method', () => {
		const url = urlBuilder.toString();
		assert.deepEqual(typeof url, 'string');
	});
});
