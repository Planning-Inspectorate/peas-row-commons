class CasesPage {
	clickAnchorNavigationLink(
		section:
			| 'overview'
			| 'case-details'
			| 'team'
			| 'timetable'
			| 'key-contacts'
			| 'procedure-1'
			| 'procedure-2'
			| 'procedure-3'
			| 'outcome'
			| 'documents'
			| 'withdrawal-or-abeyance'
			| 'costs'
	): void {
		const sectionMap: Record<
			typeof section,
			{
				anchorHref: string;
				cardSelector: string;
				titleText: string;
			}
		> = {
			overview: {
				anchorHref: '#overview',
				cardSelector: '#overview',
				titleText: 'Overview'
			},
			'case-details': {
				anchorHref: '#case details',
				cardSelector: '#case\\ details',
				titleText: 'Case details'
			},
			team: {
				anchorHref: '#team',
				cardSelector: '#team',
				titleText: 'Team'
			},
			timetable: {
				anchorHref: '#timetable',
				cardSelector: '#timetable',
				titleText: 'Timetable'
			},
			'key-contacts': {
				anchorHref: '#key contacts',
				cardSelector: '#key\\ contacts',
				titleText: 'Key contacts'
			},
			'procedure-1': {
				anchorHref: '#procedure 1',
				cardSelector: '#procedure\\ 1',
				titleText: 'Procedure 1'
			},
			'procedure-2': {
				anchorHref: '#procedure 2',
				cardSelector: '#procedure\\ 2',
				titleText: 'Procedure 2'
			},
			'procedure-3': {
				anchorHref: '#procedure 3',
				cardSelector: '#procedure\\ 3',
				titleText: 'Procedure 3'
			},
			outcome: {
				anchorHref: '#outcome',
				cardSelector: '#outcome',
				titleText: 'Outcome'
			},
			documents: {
				anchorHref: '#documents',
				cardSelector: '#documents',
				titleText: 'Documents'
			},
			'withdrawal-or-abeyance': {
				anchorHref: '#withdrawal or abeyance',
				cardSelector: '#withdrawal\\ or\\ abeyance',
				titleText: 'Withdrawal or abeyance'
			},
			costs: {
				anchorHref: '#costs',
				cardSelector: '#costs',
				titleText: 'Costs'
			}
		};

		const { anchorHref, cardSelector, titleText } = sectionMap[section];
		cy.get(cardSelector).find('.govuk-summary-card__title').should('exist').and('not.be.visible');
		cy.get(`a[href="${anchorHref}"]`).should('exist').and('be.visible').click();
		cy.get(cardSelector).find('.govuk-summary-card__title').should('be.visible').and('have.text', titleText);
	}

	clickCaseNotes(action: 'open' | 'add'): void {
		const summarySelector = '.govuk-details__summary-text';
		const addCaseNoteButtonText = 'Add case note';

		if (action === 'open') {
			cy.contains('button', addCaseNoteButtonText).should('exist').and('not.be.visible');
			cy.get(summarySelector).should('exist').and('be.visible').click();
			cy.contains('button', addCaseNoteButtonText).should('exist').and('be.visible');
		}

		if (action === 'add') {
			cy.contains('button', addCaseNoteButtonText).then(($btn) => {
				if (!$btn.length || !$btn.is(':visible')) {
					throw new Error('Test Failed: Tried to click "Add case note" before case notes were opened');
				}

				cy.wrap($btn).click();
			});
		}
	}

	enterCaseNoteComment(text: string): void {
		cy.get('#comment').should('exist').and('be.visible').clear().type(text).should('have.value', text);
	}

	private clickCaseSubHeaderItem(rowKeyText: string, linkSelector: string): void {
		cy.contains('.govuk-summary-list__key', rowKeyText)
			.parents('.govuk-summary-list__row')
			.then(($row) => {
				if (!$row.length) {
					throw new Error(`Test Failed: Summary row "${rowKeyText}" was not found`);
				}

				cy.wrap($row).within(() => {
					cy.get(linkSelector).then(($link) => {
						if (!$link.length) {
							throw new Error(`Test Failed: Action link for "${rowKeyText}" was not found`);
						}

						const valueCell = cy.get('.govuk-summary-list__value');
						const actionLink = cy.wrap($link);

						actionLink
							.should('be.visible')
							.invoke('text')
							.then((rawText) => {
								const actionText = rawText.trim();

								if (actionText.includes('Add')) {
									valueCell.should('contain.text', '-');
								} else if (actionText.includes('Change')) {
									valueCell.should('not.contain.text', '-');
								} else {
									throw new Error(`Test Failed: Action link for "${rowKeyText}" was neither Add nor Change`);
								}
							});

						actionLink.click();
					});
				});
			});
	}

	clickOverviewItem(
		section:
			| 'act'
			| 'consent-sought'
			| 'primary-procedure'
			| 'inspector-band'
			| 'check-linked-cases'
			| 'check-related-cases'
	): void {
		const selectorMap: Record<typeof section, string> = {
			act: 'a[href*="/overview/act"]',
			'consent-sought': 'a[href*="/overview/consent-sought"]',
			'primary-procedure': 'a[href*="/overview/primary-procedure"]',
			'inspector-band': 'a[href*="/overview/inspector-band"]',
			'check-linked-cases': 'a[href*="/overview/check-linked-cases"]',
			'check-related-cases': 'a[href*="/overview/check-related-cases"]'
		};

		const rowKeyMap: Record<typeof section, string> = {
			act: 'Act',
			'consent-sought': 'Consent sought',
			'primary-procedure': 'Primary procedure',
			'inspector-band': 'Inspector band',
			'check-linked-cases': 'Linked case(s)',
			'check-related-cases': 'Related case(s)'
		};

		cy.get('#overview').within(() => {
			this.clickCaseSubHeaderItem(rowKeyMap[section], selectorMap[section]);
		});
	}

	clickTeamItem(item: 'case-officer' | 'inspector-details'): void {
		const linkSelectorMap: Record<typeof item, string> = {
			'case-officer': 'a[href*="/team/case-officer"]',
			'inspector-details': 'a[href*="/team/inspector-details"]'
		};

		const rowKeyMap: Record<typeof item, string> = {
			'case-officer': 'Case officer',
			'inspector-details': 'Inspector(s)'
		};

		cy.get('#team').within(() => {
			this.clickCaseSubHeaderItem(rowKeyMap[item], linkSelectorMap[item]);
		});
	}

	clickTimetableItem(
		item:
			| 'case-received-date'
			| 'start-date'
			| 'expected-submission-date'
			| 'target-decision-date'
			| 'case-officer-verification-date'
			| 'date-proposed-modifications-advertised'
			| 'objection-period-end-date'
			| 'deadline-consent'
			| 'date-due-in-ogd'
			| 'proposal-letter-date'
			| 'date-decision-must-be-issued-by'
			| 'date-parties-must-be-notified-decision'
	): void {
		const linkSelectorMap: Record<typeof item, string> = {
			'case-received-date': 'a[href*="/timetable/case-received-date"]',
			'start-date': 'a[href*="/timetable/start-date"]',
			'expected-submission-date': 'a[href*="/timetable/expected-submission-date"]',
			'target-decision-date': 'a[href*="/timetable/target-decision-date"]',
			'case-officer-verification-date': 'a[href*="/timetable/case-officer-verification-date"]',
			'date-proposed-modifications-advertised': 'a[href*="/timetable/date-proposed-modifications-advertised"]',
			'objection-period-end-date': 'a[href*="/timetable/objection-period-end-date"]',
			'deadline-consent': 'a[href*="/timetable/deadline-consent"]',
			'date-due-in-ogd': 'a[href*="/timetable/date-due-in-ogd"]',
			'proposal-letter-date': 'a[href*="/timetable/proposal-letter-date"]',
			'date-decision-must-be-issued-by': 'a[href*="/timetable/date-decision-must-be-issued-by"]',
			'date-parties-must-be-notified-decision': 'a[href*="/timetable/date-parties-must-be-notified-decision"]'
		};

		const rowKeyMap: Record<typeof item, string> = {
			'case-received-date': 'Case received / submitted',
			'start-date': 'Start date',
			'expected-submission-date': 'Expected submission date',
			'target-decision-date': 'Target decision date',
			'case-officer-verification-date': 'Case officer verification date',
			'date-proposed-modifications-advertised': 'Date proposed modifications advertised',
			'objection-period-end-date': 'Objection period ends',
			'deadline-consent': 'Deadline for consent',
			'date-due-in-ogd': 'Date due to Other Government Department (OGD)',
			'proposal-letter-date': 'Proposal letter date',
			'date-decision-must-be-issued-by': 'Date decision must be issued by / expiry date',
			'date-parties-must-be-notified-decision': 'Date to notify parties of decision'
		};

		cy.get('#timetable').within(() => {
			this.clickCaseSubHeaderItem(rowKeyMap[item], linkSelectorMap[item]);
		});
	}

	clickKeyContactsItem(item: 'objector-details' | 'contact-details'): void {
		const linkSelectorMap: Record<typeof item, string> = {
			'objector-details': 'a[href*="/key-contacts/objector-details"]',
			'contact-details': 'a[href*="/key-contacts/contact-details"]'
		};

		const rowKeyMap: Record<typeof item, string> = {
			'objector-details': 'Objector(s)',
			'contact-details': 'Contact(s)'
		};

		cy.get('#key\\ contacts').within(() => {
			this.clickCaseSubHeaderItem(rowKeyMap[item], linkSelectorMap[item]);
		});
	}

	clickProcedureItem(procedure: 'procedure1' | 'procedure2' | 'procedure3', item: 'type-of-procedure'): void {
		const cardSelectorMap: Record<typeof procedure, string> = {
			procedure1: '#procedure\\ 1',
			procedure2: '#procedure\\ 2',
			procedure3: '#procedure\\ 3'
		};

		const linkSelectorMap: Record<typeof procedure, Record<typeof item, string>> = {
			procedure1: { 'type-of-procedure': 'a[href*="/procedure-one/type-of-procedure"]' },
			procedure2: { 'type-of-procedure': 'a[href*="/procedure-two/type-of-procedure"]' },
			procedure3: { 'type-of-procedure': 'a[href*="/procedure-three/type-of-procedure"]' }
		};

		const rowKeyMap: Record<typeof item, string> = {
			'type-of-procedure': 'Procedure type'
		};

		const cardSelector = cardSelectorMap[procedure];

		cy.get(cardSelector).within(() => {
			this.clickCaseSubHeaderItem(rowKeyMap[item], linkSelectorMap[procedure][item]);
		});
	}

	clickOutcomeItem(
		item:
			| 'type-of-decision'
			| 'decision-maker'
			| 'outcome'
			| 'in-target'
			| 'outcome-date'
			| 'decision-received-date'
			| 'parties-notified-date'
			| 'order-decision-dispatch-date'
			| 'sealed-order-returned-date'
			| 'decision-published-date'
			| 'fencing-permanent'
	): void {
		const linkSelectorMap: Record<typeof item, string> = {
			'type-of-decision': 'a[href*="/outcome/type-of-decision"]',
			'decision-maker': 'a[href*="/outcome/decision-maker"]',
			outcome: 'a[href*="/outcome/outcome"]',
			'in-target': 'a[href*="/outcome/in-target"]',
			'outcome-date': 'a[href*="/outcome/outcome-date"]',
			'decision-received-date': 'a[href*="/outcome/decision-received-date"]',
			'parties-notified-date': 'a[href*="/outcome/parties-notified-date"]',
			'order-decision-dispatch-date': 'a[href*="/outcome/order-decision-dispatch-date"]',
			'sealed-order-returned-date': 'a[href*="/outcome/sealed-order-returned-date"]',
			'decision-published-date': 'a[href*="/outcome/decision-published-date"]',
			'fencing-permanent': 'a[href*="/outcome/fencing-permanent"]'
		};

		const rowKeyMap: Record<typeof item, string> = {
			'type-of-decision': 'Type of decision or report',
			'decision-maker': 'Decision maker',
			outcome: 'Outcome',
			'in-target': 'In target?',
			'outcome-date': 'Outcome date',
			'decision-received-date': 'Decision received',
			'parties-notified-date': 'Parties notified of outcome',
			'order-decision-dispatch-date': 'Order decision dispatch',
			'sealed-order-returned-date': 'Sealed order returned',
			'decision-published-date': 'Decision published',
			'fencing-permanent': 'Is fencing permanent'
		};

		cy.get('#outcome').within(() => {
			this.clickCaseSubHeaderItem(rowKeyMap[item], linkSelectorMap[item]);
		});
	}

	clickDocumentsItem(item: 'files-location'): void {
		const linkSelectorMap: Record<typeof item, string> = {
			'files-location': 'a[href*="/documents/files-location"]'
		};

		const rowKeyMap: Record<typeof item, string> = {
			'files-location': 'Files location'
		};

		cy.get('#documents').within(() => {
			this.clickCaseSubHeaderItem(rowKeyMap[item], linkSelectorMap[item]);
		});
	}

	clickWithdrawalOrAbeyanceItem(item: 'withdrawal-date' | 'abeyance-start-date' | 'abeyance-end-date'): void {
		const linkSelectorMap: Record<typeof item, string> = {
			'withdrawal-date': 'a[href*="/withdrawal-abeyance/withdrawal-date"]',
			'abeyance-start-date': 'a[href*="/withdrawal-abeyance/abeyance-start-date"]',
			'abeyance-end-date': 'a[href*="/withdrawal-abeyance/abeyance-end-date"]'
		};

		const rowKeyMap: Record<typeof item, string> = {
			'withdrawal-date': 'Withdrawal date',
			'abeyance-start-date': 'Abeyance start date',
			'abeyance-end-date': 'Abeyance end date'
		};

		const linkSelector = linkSelectorMap[item];
		const rowKeyText = rowKeyMap[item];

		cy.get('#withdrawal\\ or\\ abeyance').within(() => {
			this.clickCaseSubHeaderItem(rowKeyText, linkSelector);
		});
	}

	clickCostsItem(item: 'rechargeable' | 'final-cost' | 'fee-received' | 'invoice-sent'): void {
		const linkSelectorMap: Record<typeof item, string> = {
			rechargeable: 'a[href*="/costs/rechargeable"]',
			'final-cost': 'a[href*="/costs/final-cost"]',
			'fee-received': 'a[href*="/costs/fee-received"]',
			'invoice-sent': 'a[href*="/costs/invoice-sent"]'
		};

		const rowKeyMap: Record<typeof item, string> = {
			rechargeable: 'Rechargeable',
			'final-cost': 'Final cost',
			'fee-received': 'Fee received',
			'invoice-sent': 'Invoice sent'
		};

		const linkSelector = linkSelectorMap[item];
		const rowKeyText = rowKeyMap[item];

		cy.get('#costs').within(() => {
			this.clickCaseSubHeaderItem(rowKeyText, linkSelector);
		});
	}
}

export default CasesPage;
