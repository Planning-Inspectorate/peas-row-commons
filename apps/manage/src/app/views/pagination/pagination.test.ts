import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import path from 'path';
import nunjucks from 'nunjucks';
import { fileURLToPath } from 'url';

describe('pagination macro', () => {
	const wrapperTemplate = `
      {% import 'pagination/pagination.njk' as pagination %}
      {{ pagination.renderPagination(currentPage, totalPages, currentUrl) }}
    `;
	const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
	const originalEnv = { ...process.env };

	let nunjucks: any;

	beforeEach(() => {
		process.env.SESSION_SECRET = 'dummy_value';
		process.env.GOV_NOTIFY_DISABLED = 'true';
		process.env.SHAREPOINT_DISABLED = 'true';

		nunjucks = configureNunjucks();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	// --- EXISTING TESTS ---

	it('should render pagination correctly based on current page and total pages with elipses when current page greater than 3', () => {
		const currentPage = 4;
		const totalPages = 5;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = `${basePath}?page=4`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=1" aria-label="Page 1">`),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=3" aria-label="Page 3">`),
			'Page 3 link should be present'
		);
		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=4" aria-label="Page 4" aria-current="page">`
			),
			'Page 4 link should be current page and present'
		);
		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=5" aria-label="Page 5">`),
			'Page 5 link should be present'
		);

		assert.ok(
			rendered.includes('<li class="govuk-pagination__item govuk-pagination__item--ellipsis">'),
			'Elipses should be present'
		);

		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=3" rel="prev">`),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=5" rel="next">`),
			'Next page link should be rendered'
		);
	});

	it('should render pagination correctly based on current page and total pages with elipses when current page less than total pages minus 2', () => {
		const currentPage = 2;
		const totalPages = 7;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = `${basePath}?page=2`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=1" aria-label="Page 1">`),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=2" aria-label="Page 2" aria-current="page">`
			),
			'Page 2 link should be current page and present'
		);
		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=3" aria-label="Page 3">`),
			'Page 3 link should be present'
		);
		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=7" aria-label="Page 7">`),
			'Page 7 link should be present'
		);

		assert.ok(
			rendered.includes('<li class="govuk-pagination__item govuk-pagination__item--ellipsis">'),
			'Elipses should be present'
		);

		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=1" rel="prev">`),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=3" rel="next">`),
			'Next page link should be rendered'
		);
	});

	it('should render pagination correctly based on current page and total pages without elipses when only 3 pages', () => {
		const currentPage = 2;
		const totalPages = 3;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = `${basePath}?page=2`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=1" aria-label="Page 1">`),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=2" aria-label="Page 2" aria-current="page">`
			),
			'Page 2 link should be current page and present'
		);
		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=3" aria-label="Page 3">`),
			'Page 3 link should be present'
		);

		assert.ok(
			!rendered.includes('<li class="govuk-pagination__item govuk-pagination__item--ellipsis">'),
			'Elipses should not be present'
		);

		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=1" rel="prev">`),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=3" rel="next">`),
			'Next page link should be rendered'
		);
	});

	it('should render pagination correctly and append page url parameter with ampersand', () => {
		const currentPage = 2;
		const totalPages = 3;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = `${basePath}?itemsPerPage=25&page=2`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?itemsPerPage=25&amp;page=1" aria-label="Page 1">`
			),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?itemsPerPage=25&amp;page=2" aria-label="Page 2" aria-current="page">`
			),
			'Page 2 link should be current page and present'
		);
		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?itemsPerPage=25&amp;page=3" aria-label="Page 3">`
			),
			'Page 3 link should be present'
		);
	});

	it('should not render pagination links if current page and total pages have values of 1', () => {
		const currentPage = 1;
		const totalPages = 1;
		const currentUrl = `/applications/${applicationId}/written-representations?page=1`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes('<nav class="govuk-pagination" aria-label="Pagination">'),
			'Pagination element should be present'
		);
		assert.ok(rendered.includes('<ul class="govuk-pagination__list">\n  \n  </ul>'), 'Pagination list should be empty');
	});

	it('should correctly preserve multiple existing filters (area, type) while changing page', () => {
		const currentPage = 1;
		const totalPages = 5;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = `${basePath}?area=North&type=Commercial&page=1`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?area=North&amp;type=Commercial&amp;page=2" rel="next">`
			),
			'Next link should preserve area and type filters'
		);
	});

	it('should correctly handle when "page" is the FIRST parameter (removing leading & orphan)', () => {
		const currentPage = 1;
		const totalPages = 3;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = `${basePath}?page=1&sort=date`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?sort=date&amp;page=2" rel="next">`
			),
			'Should correctly reformat URL when page was the first parameter'
		);
	});

	it('should correctly handle when "page" is in the MIDDLE of other parameters', () => {
		const currentPage = 2;
		const totalPages = 4;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = `${basePath}?foo=bar&page=2&baz=qux`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?foo=bar&amp;baz=qux&amp;page=3" rel="next">`
			),
			'Should cleanly remove page from middle and append new page to end'
		);
	});

	it('should correctly handle a URL with NO query parameters initially', () => {
		const currentPage = 1;
		const totalPages = 3;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = basePath; // No ?... at all

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(`<a class="govuk-link govuk-pagination__link" href="${basePath}?page=2" rel="next">`),
			'Should use ? separator when no parameters exist'
		);
	});

	it('should correctly handle array-like parameters (multiple values for same key)', () => {
		const currentPage = 1;
		const totalPages = 2;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = `${basePath}?area=North&area=South&page=1`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?area=North&amp;area=South&amp;page=2" rel="next">`
			),
			'Should preserve repeated query parameters (arrays)'
		);
	});

	it('should NOT incorrectly strip "page" from other parameter names (Collision Test)', () => {
		const currentPage = 1;
		const totalPages = 3;
		const basePath = `/applications/${applicationId}/written-representations`;
		const currentUrl = `${basePath}?itemsPerPage=10&page=1`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(
				`<a class="govuk-link govuk-pagination__link" href="${basePath}?itemsPerPage=10&amp;page=2" rel="next">`
			),
			'Should not corrupt parameters that contain the word Page'
		);
	});
});

function configureNunjucks() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const require = createRequire(import.meta.url);
	const paths = [path.resolve(require.resolve('govuk-frontend'), '../..'), path.join(__dirname, '..')];
	return nunjucks.configure(paths);
}
