export interface FilterItem {
	value: string;
	text: string;
	checked?: boolean;
}

export interface SelectedFilterItem {
	href: string;
	text: string;
}

export interface FilterViewModel {
	checkboxGroups: Array<
		Array<{
			idPrefix: string;
			name: string;
			legend: string;
			items: FilterItem[];
		}>
	>;
	selectedCategories: {
		clearLinkHref: string;
		categories: Array<{
			heading: { text: string };
			items: SelectedFilterItem[];
		}>;
	};
}

export type CurrentFilters = {
	readStatus: string[];
	flaggedStatus: string[];
};

export type CountMap = Record<string, number>;

export const DOCUMENT_FILTER_KEYS = {
	READ: 'readStatus',
	FLAG: 'flaggedStatus'
};

export const DOCUMENT_FILTER_VALUES = {
	READ: 'read',
	UNREAD: 'unread',
	FLAGGED: 'flagged',
	UNFLAGGED: 'unflagged'
};

/**
 * Generates the filter data for Document statuses (Read/Unread and Flagged/Unflagged),
 * createing the tabs, the checkboxes, and the links needed for adding and clearing items.
 */
export class DocumentFilterGenerator {
	/**
	 * Entry function used for starting the process of creating the various components needed.
	 */
	public generateFilters(query: Record<string, unknown>, baseUrl: string, counts: CountMap): FilterViewModel {
		const selectedReadStatuses = this.getSelectedValues(query, DOCUMENT_FILTER_KEYS.READ);
		const selectedFlagStatuses = this.getSelectedValues(query, DOCUMENT_FILTER_KEYS.FLAG);

		const checkboxGroups = this.generateCheckboxes(selectedReadStatuses, selectedFlagStatuses, counts);

		const selectedCategories = this.createSelectedCategories(
			query,
			baseUrl,
			selectedReadStatuses,
			selectedFlagStatuses
		);

		return {
			checkboxGroups,
			selectedCategories: {
				clearLinkHref: baseUrl,
				categories: selectedCategories
			}
		};
	}

	/**
	 * Finds what was selected in the query parameters.
	 */
	private getSelectedValues(query: Record<string, any>, key: string): string[] {
		const val = query[key];
		if (Array.isArray(val)) return val;
		if (typeof val === 'string' && val) return [val];
		return [];
	}

	/**
	 * Creates the 2 groups of 2 checkboxes:
	 * Read status -> Read & Unread
	 * Flagged status -> Flagged & Unflagged
	 */
	private generateCheckboxes(selectedRead: string[], selectedFlagged: string[], counts: CountMap) {
		return [
			[
				{
					idPrefix: 'filter-read-status',
					name: DOCUMENT_FILTER_KEYS.READ,
					legend: 'Select read status',
					items: [
						{
							value: DOCUMENT_FILTER_VALUES.READ,
							text: `Read (${counts[DOCUMENT_FILTER_VALUES.READ] || 0})`,
							checked: selectedRead.includes(DOCUMENT_FILTER_VALUES.READ)
						},
						{
							value: DOCUMENT_FILTER_VALUES.UNREAD,
							text: `Unread (${counts[DOCUMENT_FILTER_VALUES.UNREAD] || 0})`,
							checked: selectedRead.includes(DOCUMENT_FILTER_VALUES.UNREAD)
						}
					]
				}
			],
			[
				{
					idPrefix: 'filter-flag-status',
					name: DOCUMENT_FILTER_KEYS.FLAG,
					legend: 'Select flagged status',
					items: [
						{
							value: DOCUMENT_FILTER_VALUES.FLAGGED,
							text: `Flagged (${counts[DOCUMENT_FILTER_VALUES.FLAGGED] || 0})`,
							checked: selectedFlagged.includes(DOCUMENT_FILTER_VALUES.FLAGGED)
						},
						{
							value: DOCUMENT_FILTER_VALUES.UNFLAGGED,
							text: `Unflagged (${counts[DOCUMENT_FILTER_VALUES.UNFLAGGED] || 0})`,
							checked: selectedFlagged.includes(DOCUMENT_FILTER_VALUES.UNFLAGGED)
						}
					]
				}
			]
		];
	}

	/**
	 * Creates the data needed for the top of the component that displays the currently selected items from the
	 * checkboxes below. With the X button to remove them and refresh the page.
	 */
	private createSelectedCategories(
		query: Record<string, unknown>,
		baseUrl: string,
		selectedRead: string[],
		selectedFlagged: string[]
	) {
		const categories = [];

		if (selectedRead.length > 0) {
			categories.push({
				heading: { text: 'Read status' },
				items: selectedRead.map((val) => this.buildClearLink(query, baseUrl, DOCUMENT_FILTER_KEYS.READ, val))
			});
		}

		if (selectedFlagged.length > 0) {
			categories.push({
				heading: { text: 'Flagged status' },
				items: selectedFlagged.map((val) => this.buildClearLink(query, baseUrl, DOCUMENT_FILTER_KEYS.FLAG, val))
			});
		}

		return categories;
	}

	/**
	 * Builds the "X" remove link for the MoJ filter tags by reconstructing the URL
	 * without the current value.
	 */
	private buildClearLink(
		query: Record<string, any>,
		baseUrl: string,
		paramKey: string,
		valueToRemove: string
	): SelectedFilterItem {
		const params = new URLSearchParams();

		Object.keys(query).forEach((key) => {
			const vals = this.getSelectedValues(query, key);
			vals.forEach((val) => {
				if (key !== paramKey || val !== valueToRemove) {
					params.append(key, val);
				}
			});
		});

		const queryString = params.toString();

		const displayText = valueToRemove.charAt(0).toUpperCase() + valueToRemove.slice(1);

		return {
			text: displayText,
			href: queryString ? `${baseUrl}?${queryString}` : baseUrl
		};
	}

	/**
	 * Because we have an architecture that prioritises a default if no rows are present, we have to make sure our query accounts for
	 * this. For example, if we are searching for all "Read" documents, if the current case has a default of Read = true (e.g. is a migrated case)
	 * then we need to make sure we search for (a) a row for that document with read = true but also search for a LACK of row, as both indicate
	 * a read status of true, and vice versa. Hence why we have `some:` and `none:` in the queries
	 */
	public createPrismaDocumentWhere(
		query: Record<string, unknown>,
		userId: string,
		defaultIsRead: boolean,
		defaultIsFlagged: boolean
	) {
		const wantsRead = this.getSelectedValues(query, DOCUMENT_FILTER_KEYS.READ).includes(DOCUMENT_FILTER_VALUES.READ);
		const wantsUnread = this.getSelectedValues(query, DOCUMENT_FILTER_KEYS.READ).includes(
			DOCUMENT_FILTER_VALUES.UNREAD
		);

		const wantsFlagged = this.getSelectedValues(query, DOCUMENT_FILTER_KEYS.FLAG).includes(
			DOCUMENT_FILTER_VALUES.FLAGGED
		);
		const wantsUnflagged = this.getSelectedValues(query, DOCUMENT_FILTER_KEYS.FLAG).includes(
			DOCUMENT_FILTER_VALUES.UNFLAGGED
		);

		const AND = [];

		// Only bother running these queries if 1 of the items is selected, as together they just cancel out.
		if (wantsRead !== wantsUnread) {
			const isSearchingForRead = wantsRead;

			if (isSearchingForRead === defaultIsRead) {
				AND.push({
					OR: [
						{ UserDocuments: { some: { User: { idpUserId: userId }, readStatus: isSearchingForRead } } },
						{ UserDocuments: { none: { User: { idpUserId: userId } } } }
					]
				});
			} else {
				AND.push({
					UserDocuments: { some: { User: { idpUserId: userId }, readStatus: isSearchingForRead } }
				});
			}
		}

		// Same as above but for flagged rather than read
		if (wantsFlagged !== wantsUnflagged) {
			const isSearchingForFlagged = wantsFlagged;

			if (isSearchingForFlagged === defaultIsFlagged) {
				AND.push({
					OR: [
						{ UserDocuments: { some: { User: { idpUserId: userId }, flaggedStatus: isSearchingForFlagged } } },
						{ UserDocuments: { none: { User: { idpUserId: userId } } } }
					]
				});
			} else {
				AND.push({
					UserDocuments: { some: { User: { idpUserId: userId }, flaggedStatus: isSearchingForFlagged } }
				});
			}
		}

		return AND.length > 0 ? { AND } : {};
	}

	public createCurrentlySelectedFilterValues(query: Record<string, unknown>) {
		const readStatus = this.getSelectedValues(query, DOCUMENT_FILTER_KEYS.READ);
		const flaggedStatus = this.getSelectedValues(query, DOCUMENT_FILTER_KEYS.FLAG);

		const currentFilters = {
			readStatus,
			flaggedStatus
		};

		const filtersValue = this.createFilterValuesString(currentFilters);

		return filtersValue;
	}

	private createFilterValuesString(currentFilters: CurrentFilters) {
		let string = '';

		for (const [key, value] of Object.entries(currentFilters)) {
			value.forEach((item) => {
				string += `&${key}=${item}`;
			});
		}

		return string;
	}
}
