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

	it('should render pagination correctly based on current page and total pages with elipses when current page greater than 3', () => {
		const currentPage = 4;
		const totalPages = 5;
		const currentUrl = `/applications/${applicationId}/written-representations?page=4`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" aria-label="Page 1">'),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" aria-label="Page 3">'),
			'Page 3 link should be present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="?page=4" aria-label="Page 4" aria-current="page">'
			),
			'Page 4 link should be current page and present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=5" aria-label="Page 5">'),
			'Page 5 link should be present'
		);

		assert.ok(
			rendered.includes('<li class="govuk-pagination__item govuk-pagination__item--ellipsis">'),
			'Elipses should be present'
		);

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" rel="prev">'),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=5" rel="next">'),
			'Next page link should be rendered'
		);
	});

	it('should render pagination correctly based on current page and total pages with elipses when current page less than total pages minus 2', () => {
		const currentPage = 2;
		const totalPages = 7;
		const currentUrl = `/applications/${applicationId}/written-representations?page=2`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" aria-label="Page 1">'),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="?page=2" aria-label="Page 2" aria-current="page">'
			),
			'Page 2 link should be current page and present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" aria-label="Page 3">'),
			'Page 3 link should be present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=7" aria-label="Page 7">'),
			'Page 7 link should be present'
		);

		assert.ok(
			rendered.includes('<li class="govuk-pagination__item govuk-pagination__item--ellipsis">'),
			'Elipses should be present'
		);

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" rel="prev">'),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" rel="next">'),
			'Next page link should be rendered'
		);
	});

	it('should render pagination correctly based on current page and total pages without elipses when only 3 pages', () => {
		const currentPage = 2;
		const totalPages = 3;
		const currentUrl = `/applications/${applicationId}/written-representations?page=2`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" aria-label="Page 1">'),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="?page=2" aria-label="Page 2" aria-current="page">'
			),
			'Page 2 link should be current page and present'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" aria-label="Page 3">'),
			'Page 3 link should be present'
		);

		assert.ok(
			!rendered.includes('<li class="govuk-pagination__item govuk-pagination__item--ellipsis">'),
			'Elipses should not be present'
		);

		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=1" rel="prev">'),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes('<a class="govuk-link govuk-pagination__link" href="?page=3" rel="next">'),
			'Next page link should be rendered'
		);
	});

	it('should render pagination correctly and append page url parameter with ampersand', () => {
		const currentPage = 2;
		const totalPages = 3;
		const currentUrl = `/applications/${applicationId}/written-representations?itemsPerPage=25&page=2`;

		const rendered = nunjucks.renderString(wrapperTemplate, {
			currentPage,
			totalPages,
			currentUrl
		});

		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=1" aria-label="Page 1">'
			),
			'Page 1 link should be present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=2" aria-label="Page 2" aria-current="page">'
			),
			'Page 2 link should be current page and present'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=3" aria-label="Page 3">'
			),
			'Page 3 link should be present'
		);

		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=1" rel="prev">'
			),
			'Previous page link should be rendered'
		);
		assert.ok(
			rendered.includes(
				'<a class="govuk-link govuk-pagination__link" href="/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/written-representations?itemsPerPage=25&amp;page=3" rel="next">'
			),
			'Next page link should be rendered'
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
});

function configureNunjucks() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const require = createRequire(import.meta.url);
	const paths = [
		// get the path to the govuk-frontend folder, in node_modules, using the node require resolution
		path.resolve(require.resolve('govuk-frontend'), '../..'),
		// path to src folder
		path.join(__dirname, '..')
	];
	return nunjucks.configure(paths);
}
