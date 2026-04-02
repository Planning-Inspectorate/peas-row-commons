import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	DocumentFilterGenerator,
	DOCUMENT_FILTER_KEYS,
	DOCUMENT_FILTER_VALUES
} from './user-document-filter-generator.ts';

describe('DocumentFilterGenerator Integration Tests', () => {
	const generator = new DocumentFilterGenerator();
	const baseUrl = '/cases/123/folders/456';
	const userId = 'test-user-id';

	const mockCounts = {
		[DOCUMENT_FILTER_VALUES.READ]: 10,
		[DOCUMENT_FILTER_VALUES.UNREAD]: 5,
		[DOCUMENT_FILTER_VALUES.FLAGGED]: 2,
		[DOCUMENT_FILTER_VALUES.UNFLAGGED]: 13
	};

	describe('Query Logic (createPrismaDocumentWhere)', () => {
		it('should return an empty object if query is empty', () => {
			const result = generator.createPrismaDocumentWhere({}, userId, false, false);
			assert.deepStrictEqual(result, {});
		});

		it('should return an empty object if BOTH Read and Unread are selected', () => {
			const query = {
				[DOCUMENT_FILTER_KEYS.READ]: [DOCUMENT_FILTER_VALUES.READ, DOCUMENT_FILTER_VALUES.UNREAD]
			};
			const result = generator.createPrismaDocumentWhere(query, userId, false, false);
			assert.deepStrictEqual(result, {});
		});

		it('should generate an OR condition when searching for the DEFAULT read state', () => {
			const query = { [DOCUMENT_FILTER_KEYS.READ]: DOCUMENT_FILTER_VALUES.UNREAD };
			const defaultIsRead = false;

			const result = generator.createPrismaDocumentWhere(query, userId, defaultIsRead, false);

			assert.deepStrictEqual(result, {
				AND: [
					{
						OR: [
							{ UserDocuments: { some: { User: { idpUserId: userId }, readStatus: false } } },
							{ UserDocuments: { none: { User: { idpUserId: userId } } } }
						]
					}
				]
			});
		});

		it('should generate ONLY a some condition when searching for the OVERRIDE read state', () => {
			const query = { [DOCUMENT_FILTER_KEYS.READ]: DOCUMENT_FILTER_VALUES.READ };
			const defaultIsRead = false;

			const result = generator.createPrismaDocumentWhere(query, userId, defaultIsRead, false);

			assert.deepStrictEqual(result, {
				AND: [
					{
						UserDocuments: { some: { User: { idpUserId: userId }, readStatus: true } }
					}
				]
			});
		});

		it('should combine Read and Flagged queries successfully', () => {
			const query = {
				[DOCUMENT_FILTER_KEYS.READ]: DOCUMENT_FILTER_VALUES.READ,
				[DOCUMENT_FILTER_KEYS.FLAG]: DOCUMENT_FILTER_VALUES.FLAGGED
			};

			const result = generator.createPrismaDocumentWhere(query, userId, true, false);

			assert.strictEqual(result.AND?.length, 2);

			assert.deepStrictEqual(result.AND?.[0], {
				OR: [
					{ UserDocuments: { some: { User: { idpUserId: userId }, readStatus: true } } },
					{ UserDocuments: { none: { User: { idpUserId: userId } } } }
				]
			});

			assert.deepStrictEqual(result.AND?.[1], {
				UserDocuments: { some: { User: { idpUserId: userId }, flaggedStatus: true } }
			});
		});
	});

	describe('Checkbox Generation', () => {
		it('should generate checkbox groups with correct counts and text', () => {
			const result = generator.generateFilters({}, baseUrl, mockCounts);
			const groups = result.checkboxGroups;

			assert.strictEqual(groups.length, 2);

			const readGroup = groups[0][0];
			assert.strictEqual(readGroup.legend, 'Select read status');
			assert.strictEqual(readGroup.items[0].text, 'Read (10)');
			assert.strictEqual(readGroup.items[1].text, 'Unread (5)');

			const flagGroup = groups[1][0];
			assert.strictEqual(flagGroup.legend, 'Select flagged status');
			assert.strictEqual(flagGroup.items[0].text, 'Flagged (2)');
			assert.strictEqual(flagGroup.items[1].text, 'Unflagged (13)');
		});

		it('should mark correct checkboxes as checked based on the query', () => {
			const query = {
				[DOCUMENT_FILTER_KEYS.READ]: [DOCUMENT_FILTER_VALUES.READ],
				[DOCUMENT_FILTER_KEYS.FLAG]: [DOCUMENT_FILTER_VALUES.FLAGGED, DOCUMENT_FILTER_VALUES.UNFLAGGED]
			};

			const result = generator.generateFilters(query, baseUrl, mockCounts);

			const readItems = result.checkboxGroups[0][0].items;
			assert.strictEqual(readItems.find((i) => i.value === 'read')?.checked, true);
			assert.strictEqual(readItems.find((i) => i.value === 'unread')?.checked, false);

			const flagItems = result.checkboxGroups[1][0].items;
			assert.strictEqual(flagItems.find((i) => i.value === 'flagged')?.checked, true);
			assert.strictEqual(flagItems.find((i) => i.value === 'unflagged')?.checked, true);
		});
	});

	describe('Selected Categories', () => {
		it('should generate selected tags for active filters', () => {
			const query = {
				[DOCUMENT_FILTER_KEYS.READ]: DOCUMENT_FILTER_VALUES.UNREAD
			};

			const result = generator.generateFilters(query, baseUrl, mockCounts);
			const categories = result.selectedCategories.categories;

			assert.strictEqual(categories.length, 1);
			assert.strictEqual(categories[0].heading.text, 'Read status');
			assert.strictEqual(categories[0].items[0].text, 'Unread');
			assert.strictEqual(categories[0].items[0].href, baseUrl);
		});

		it('should generate correct removal links that retain other query parameters', () => {
			const query = {
				[DOCUMENT_FILTER_KEYS.READ]: DOCUMENT_FILTER_VALUES.READ,
				[DOCUMENT_FILTER_KEYS.FLAG]: DOCUMENT_FILTER_VALUES.FLAGGED,
				page: '3',
				search: 'test'
			};

			const result = generator.generateFilters(query, baseUrl, mockCounts);
			const categories = result.selectedCategories.categories;

			const readCat = categories.find((c) => c.heading.text === 'Read status');
			const readClearHref = readCat?.items[0].href || '';

			assert.ok(!readClearHref.includes(`${DOCUMENT_FILTER_KEYS.READ}=${DOCUMENT_FILTER_VALUES.READ}`));
			assert.ok(readClearHref.includes(`${DOCUMENT_FILTER_KEYS.FLAG}=${DOCUMENT_FILTER_VALUES.FLAGGED}`));
			assert.ok(readClearHref.includes('page=3'));
			assert.ok(readClearHref.includes('search=test'));
		});

		it('should handle removing one item from an array selection successfully', () => {
			const query = {
				[DOCUMENT_FILTER_KEYS.FLAG]: [DOCUMENT_FILTER_VALUES.FLAGGED, DOCUMENT_FILTER_VALUES.UNFLAGGED]
			};

			const result = generator.generateFilters(query, baseUrl, mockCounts);
			const flagCat = result.selectedCategories.categories[0];

			const flaggedClearTag = flagCat.items.find((i) => i.text === 'Flagged');

			assert.ok(flaggedClearTag?.href.includes(`${DOCUMENT_FILTER_KEYS.FLAG}=${DOCUMENT_FILTER_VALUES.UNFLAGGED}`));
			assert.ok(!flaggedClearTag?.href.includes(`${DOCUMENT_FILTER_KEYS.FLAG}=${DOCUMENT_FILTER_VALUES.FLAGGED}`));
		});
	});

	describe('Filter Values String', () => {
		it('should create URL appended string for pagination', () => {
			const query = {
				[DOCUMENT_FILTER_KEYS.READ]: [DOCUMENT_FILTER_VALUES.READ],
				[DOCUMENT_FILTER_KEYS.FLAG]: [DOCUMENT_FILTER_VALUES.UNFLAGGED]
			};

			const result = generator.createCurrentlySelectedFilterValues(query);

			assert.ok(result.includes(`&${DOCUMENT_FILTER_KEYS.READ}=${DOCUMENT_FILTER_VALUES.READ}`));
			assert.ok(result.includes(`&${DOCUMENT_FILTER_KEYS.FLAG}=${DOCUMENT_FILTER_VALUES.UNFLAGGED}`));
		});

		it('should return empty string if no filters are applied', () => {
			const query = {};
			const result = generator.createCurrentlySelectedFilterValues(query);
			assert.strictEqual(result, '');
		});
	});
});
