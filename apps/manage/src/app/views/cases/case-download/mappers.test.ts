import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapCaseDetailsData, mapObjectorListData, mapContactListData, mapDownloadableDocuments } from './mappers.ts';

/** IDs matching the seed data constants */
const OBJECTOR_TYPE_ID = 'objector';
const APPLICANT_TYPE_ID = 'applicant-appellant';
const AGENT_TYPE_ID = 'agent';
const SECRETARY_OF_STATE_ID = 'secretary-of-state';

/**
 * Builds a minimal mock case data object that satisfies CaseDownloadQueryResult.
 * Individual tests override specific fields as needed.
 */
function createBaseCaseData(overrides: Record<string, unknown> = {}) {
	return {
		id: 'case-1',
		reference: 'DRT/2025/0001',
		name: 'Test Drought Order',
		receivedDate: new Date('2025-03-14'),
		location: null,
		filesLocation: null,
		relevantWebsiteLinks: null,
		consentSought: null,
		externalReference: null,
		historicalReference: null,
		Type: { id: 'drought', displayName: 'Drought' },
		SubType: null,
		Status: { id: 'new', displayName: 'New case' },
		Priority: null,
		Authority: null,
		SiteAddress: null,
		Dates: null,
		CaseOfficer: null,
		InspectorBand: null,
		Act: null,
		Section: null,
		Abeyance: null,
		AdvertisedModification: null,
		Costs: null,
		Inspectors: [],
		Contacts: [],
		Procedures: [],
		Outcome: null,
		Folders: [],
		RelatedCases: [],
		LinkedCases: [],
		...overrides
	};
}

describe('mappers', () => {
	describe('mapCaseDetailsData', () => {
		it('should map basic case fields', () => {
			const caseData = createBaseCaseData();
			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.reference, 'DRT/2025/0001');
			assert.strictEqual(result.caseName, 'Test Drought Order');
			assert.strictEqual(result.caseType, 'Drought');
			assert.strictEqual(result.caseStatus, 'New case');
			assert.ok(result.generatedDate instanceof Date);
		});

		it('should map overview fields when present', () => {
			const caseData = createBaseCaseData({
				Act: { id: 'act-1', displayName: 'Acquisition of Land Act 1981' },
				consentSought: 'Yes',
				InspectorBand: { id: '1', displayName: '1' },
				SubType: { id: 'sub-1', displayName: 'Drought Orders' }
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.act, 'Acquisition of Land Act 1981');
			assert.strictEqual(result.consentSought, 'Yes');
			assert.strictEqual(result.inspectorBand, '1');
			assert.strictEqual(result.caseSubType, 'Drought Orders');
		});

		it('should map case detail fields when present', () => {
			const caseData = createBaseCaseData({
				externalReference: 'EXT-001',
				historicalReference: 'HIST-001',
				Authority: { id: 'auth-1', name: 'Test Council' },
				Priority: { id: 'high', displayName: 'High' },
				AdvertisedModification: { id: 'am-1', displayName: 'Advertised modification 1' },
				Abeyance: {
					abeyanceStartDate: new Date('2025-01-01'),
					abeyanceEndDate: new Date('2025-02-02')
				}
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.externalReference, 'EXT-001');
			assert.strictEqual(result.historicalReference, 'HIST-001');
			assert.strictEqual(result.authority, 'Test Council');
			assert.strictEqual(result.priority, 'High');
			assert.strictEqual(result.advertisedModification, 'Advertised modification 1');
			assert.deepStrictEqual(result.abeyance?.start, new Date('2025-01-01'));
			assert.deepStrictEqual(result.abeyance?.end, new Date('2025-02-02'));
		});

		it('should map site address', () => {
			const caseData = createBaseCaseData({
				SiteAddress: {
					line1: '10 Downing Street',
					line2: null,
					townCity: 'London',
					county: null,
					postcode: 'SW1A 2AA'
				}
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.siteAddress?.addressLine1, '10 Downing Street');
			assert.strictEqual(result.siteAddress?.townCity, 'London');
			assert.strictEqual(result.siteAddress?.postcode, 'SW1A 2AA');
			assert.strictEqual(result.siteAddress?.addressLine2, undefined);
		});

		it('should return undefined siteAddress when no address exists', () => {
			const caseData = createBaseCaseData({ SiteAddress: null });
			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.siteAddress, undefined);
		});

		it('should map location when present', () => {
			const caseData = createBaseCaseData({ location: 'South West' });
			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.location, 'South West');
		});

		it('should map all date fields', () => {
			const caseData = createBaseCaseData({
				Dates: {
					startDate: new Date('2025-01-01'),
					expectedSubmissionDate: new Date('2025-02-01'),
					expiryDate: new Date('2025-03-01'),
					targetDecisionDate: new Date('2025-04-01'),
					objectionPeriodEndsDate: new Date('2025-05-01'),
					proposedModificationsDate: new Date('2025-06-01'),
					partiesDecisionNotificationDeadlineDate: new Date('2025-07-01')
				}
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.deepStrictEqual(result.dates.received, new Date('2025-03-14'));
			assert.deepStrictEqual(result.dates.start, new Date('2025-01-01'));
			assert.deepStrictEqual(result.dates.expectedSubmission, new Date('2025-02-01'));
			assert.deepStrictEqual(result.dates.expiry, new Date('2025-03-01'));
			assert.deepStrictEqual(result.dates.targetDecision, new Date('2025-04-01'));
			assert.deepStrictEqual(result.dates.objectionPeriodEnds, new Date('2025-05-01'));
			assert.deepStrictEqual(result.dates.proposedModifications, new Date('2025-06-01'));
			assert.deepStrictEqual(result.dates.partiesDecisionNotificationDeadline, new Date('2025-07-01'));
		});

		it('should map case officer name from parameter', () => {
			const result = mapCaseDetailsData(createBaseCaseData() as any, 'Jane Smith', new Map());

			assert.strictEqual(result.caseOfficer, 'Jane Smith');
		});

		it('should leave case officer undefined when not provided', () => {
			const result = mapCaseDetailsData(createBaseCaseData() as any, undefined, new Map());

			assert.strictEqual(result.caseOfficer, undefined);
		});

		it('should resolve inspector names from the lookup map', () => {
			const caseData = createBaseCaseData({
				Inspectors: [
					{ Inspector: { idpUserId: 'entra-1' }, inspectorAllocatedDate: new Date('2025-01-01') },
					{ Inspector: { idpUserId: 'entra-2' }, inspectorAllocatedDate: new Date('2025-02-01') }
				]
			});

			const inspectorNames = new Map([
				['entra-1', 'Alice Inspector'],
				['entra-2', 'Bob Inspector']
			]);

			const result = mapCaseDetailsData(caseData as any, undefined, inspectorNames);

			assert.strictEqual(result.inspectors.length, 2);
			assert.strictEqual(result.inspectors[0].name, 'Alice Inspector');
			assert.strictEqual(result.inspectors[1].name, 'Bob Inspector');
		});

		it('should fall back to IDP user ID when inspector name not in map', () => {
			const caseData = createBaseCaseData({
				Inspectors: [{ Inspector: { idpUserId: 'unknown-entra-id' }, inspectorAllocatedDate: new Date() }]
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.inspectors[0].name, 'unknown-entra-id');
		});

		it('should fall back to Unknown when inspector has no IDP user ID', () => {
			const caseData = createBaseCaseData({
				Inspectors: [{ Inspector: { idpUserId: null }, inspectorAllocatedDate: new Date() }]
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.inspectors[0].name, 'Unknown');
		});

		it('should filter only applicant/appellant contacts', () => {
			const caseData = createBaseCaseData({
				Contacts: [
					{
						contactTypeId: APPLICANT_TYPE_ID,
						firstName: 'App',
						lastName: 'Licant',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					},
					{
						contactTypeId: OBJECTOR_TYPE_ID,
						firstName: 'Obj',
						lastName: 'Ector',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					},
					{
						contactTypeId: AGENT_TYPE_ID,
						firstName: 'Ag',
						lastName: 'Ent',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					}
				]
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.applicants.length, 1);
			assert.strictEqual(result.applicants[0].firstName, 'App');
		});

		it('should map procedures with inspector name resolution', () => {
			const caseData = createBaseCaseData({
				Procedures: [
					{
						ProcedureType: { displayName: 'Hearing' },
						ProcedureStatus: { displayName: 'Active' },
						Inspector: { idpUserId: 'entra-1' },
						SiteVisitType: null,
						AdminProcedureType: null,
						siteVisitDate: null,
						HearingFormat: { displayName: 'Virtual' },
						InquiryFormat: null,
						ConferenceFormat: null,
						PreInquiryMeetingFormat: null,
						InquiryOrConference: null
					}
				]
			});

			const inspectorNames = new Map([['entra-1', 'Hearing Inspector']]);
			const result = mapCaseDetailsData(caseData as any, undefined, inspectorNames);

			assert.strictEqual(result.procedures.length, 1);
			assert.strictEqual(result.procedures[0].type, 'Hearing');
			assert.strictEqual(result.procedures[0].status, 'Active');
			assert.strictEqual(result.procedures[0].inspector, 'Hearing Inspector');
			assert.strictEqual(result.procedures[0].hearingFormat, 'Virtual');
		});

		it('should show Not allocated for procedures with no inspector', () => {
			const caseData = createBaseCaseData({
				Procedures: [
					{
						ProcedureType: { displayName: 'Admin' },
						ProcedureStatus: { displayName: 'Active' },
						Inspector: null,
						SiteVisitType: null,
						AdminProcedureType: { displayName: 'Case officer' },
						siteVisitDate: null,
						HearingFormat: null,
						InquiryFormat: null,
						ConferenceFormat: null,
						PreInquiryMeetingFormat: null,
						InquiryOrConference: null
					}
				]
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.procedures[0].inspector, 'Not allocated');
			assert.strictEqual(result.procedures[0].adminType, 'Case officer');
		});

		it('should map outcomes with decision maker resolution', () => {
			const caseData = createBaseCaseData({
				Outcome: {
					partiesNotifiedDate: new Date('2025-06-01'),
					orderDecisionDispatchDate: null,
					sealedOrderReturnedDate: null,
					decisionPublishedDate: null,
					CaseDecisions: [
						{
							DecisionType: { displayName: 'Interim' },
							DecisionMakerType: { displayName: 'Inspector' },
							decisionMakerTypeId: 'inspector',
							DecisionMaker: { idpUserId: 'entra-1' },
							Outcome: { displayName: 'Allow' },
							outcomeDate: new Date('2025-05-01'),
							decisionReceivedDate: null
						}
					]
				}
			});

			const inspectorNames = new Map([['entra-1', 'Decision Inspector']]);
			const result = mapCaseDetailsData(caseData as any, undefined, inspectorNames);

			assert.strictEqual(result.outcomes.length, 1);
			assert.strictEqual(result.outcomes[0].decisionType, 'Interim');
			assert.strictEqual(result.outcomes[0].decisionMaker, 'Decision Inspector');
			assert.strictEqual(result.outcomes[0].outcome, 'Allow');
			assert.strictEqual(
				(result.outcomeDates?.partiesNotifiedDate as Date)?.toISOString(),
				new Date('2025-06-01').toISOString()
			);
		});

		it('should resolve Secretary of State as decision maker', () => {
			const caseData = createBaseCaseData({
				Outcome: {
					partiesNotifiedDate: null,
					orderDecisionDispatchDate: null,
					sealedOrderReturnedDate: null,
					decisionPublishedDate: null,
					CaseDecisions: [
						{
							DecisionType: { displayName: 'Decision' },
							DecisionMakerType: { displayName: 'Secretary of State' },
							decisionMakerTypeId: SECRETARY_OF_STATE_ID,
							DecisionMaker: null,
							Outcome: { displayName: 'Refuse' },
							outcomeDate: null,
							decisionReceivedDate: null
						}
					]
				}
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.outcomes[0].decisionMaker, 'Secretary of State');
		});

		it('should map costs when present', () => {
			const caseData = createBaseCaseData({
				Costs: {
					rechargeable: true,
					finalCost: { toString: () => '1500.00' },
					feeReceived: false,
					InvoiceSent: { displayName: 'Yes' }
				}
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.costs?.rechargeable, true);
			assert.strictEqual(result.costs?.finalCost, '1500.00');
			assert.strictEqual(result.costs?.feeReceived, false);
			assert.strictEqual(result.costs?.invoiceSent, 'Yes');
		});

		it('should leave costs undefined when not present', () => {
			const result = mapCaseDetailsData(createBaseCaseData() as any, undefined, new Map());

			assert.strictEqual(result.costs, undefined);
		});

		it('should map related cases as string array', () => {
			const caseData = createBaseCaseData({
				RelatedCases: [{ reference: 'REL-001' }, { reference: 'REL-002' }, { reference: null }]
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.deepStrictEqual(result.relatedCases, ['REL-001', 'REL-002']);
		});

		it('should map linked cases with lead flag', () => {
			const caseData = createBaseCaseData({
				LinkedCases: [
					{ reference: 'LINK-001', isLead: true },
					{ reference: 'LINK-002', isLead: false },
					{ reference: null, isLead: false }
				]
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.linkedCases.length, 3);
			assert.strictEqual(result.linkedCases[0].reference, 'LINK-001');
			assert.strictEqual(result.linkedCases[0].isLead, true);
			assert.strictEqual(result.linkedCases[2].reference, 'N/A');
		});

		it('should map document info fields', () => {
			const caseData = createBaseCaseData({
				filesLocation: 'Cabinet B, Shelf 3',
				relevantWebsiteLinks: 'https://example.com'
			});

			const result = mapCaseDetailsData(caseData as any, undefined, new Map());

			assert.strictEqual(result.filesLocation, 'Cabinet B, Shelf 3');
			assert.strictEqual(result.relevantWebsiteLinks, 'https://example.com');
		});
	});

	describe('mapObjectorListData', () => {
		it('should filter only objector contacts', () => {
			const caseData = createBaseCaseData({
				Contacts: [
					{
						contactTypeId: OBJECTOR_TYPE_ID,
						firstName: 'Obj1',
						lastName: 'One',
						orgName: null,
						email: 'obj1@test.com',
						telephoneNumber: null,
						Address: null,
						ObjectorStatus: { displayName: 'Admissible' },
						ContactType: null
					},
					{
						contactTypeId: OBJECTOR_TYPE_ID,
						firstName: 'Obj2',
						lastName: 'Two',
						orgName: 'Org',
						email: null,
						telephoneNumber: '123',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					},
					{
						contactTypeId: APPLICANT_TYPE_ID,
						firstName: 'App',
						lastName: 'Licant',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					},
					{
						contactTypeId: AGENT_TYPE_ID,
						firstName: 'Ag',
						lastName: 'Ent',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					}
				]
			});

			const result = mapObjectorListData(caseData as any);

			assert.strictEqual(result.objectors.length, 2);
			assert.strictEqual(result.objectors[0].firstName, 'Obj1');
			assert.strictEqual(result.objectors[0].status, 'Admissible');
			assert.strictEqual(result.objectors[1].firstName, 'Obj2');
			assert.strictEqual(result.objectors[1].orgName, 'Org');
		});

		it('should return empty array when no objectors exist', () => {
			const result = mapObjectorListData(createBaseCaseData() as any);

			assert.strictEqual(result.objectors.length, 0);
		});

		it('should include reference and case name', () => {
			const result = mapObjectorListData(createBaseCaseData() as any);

			assert.strictEqual(result.reference, 'DRT/2025/0001');
			assert.strictEqual(result.caseName, 'Test Drought Order');
			assert.ok(result.generatedDate instanceof Date);
		});

		it('should map objector address when present', () => {
			const caseData = createBaseCaseData({
				Contacts: [
					{
						contactTypeId: OBJECTOR_TYPE_ID,
						firstName: 'Obj',
						lastName: 'Ector',
						orgName: null,
						email: null,
						telephoneNumber: null,
						Address: { line1: '1 Test St', line2: null, townCity: 'London', county: null, postcode: 'E1 1AA' },
						ObjectorStatus: null,
						ContactType: null
					}
				]
			});

			const result = mapObjectorListData(caseData as any);

			assert.strictEqual(result.objectors[0].address?.addressLine1, '1 Test St');
			assert.strictEqual(result.objectors[0].address?.townCity, 'London');
		});
	});

	describe('mapContactListData', () => {
		it('should exclude objectors and applicants', () => {
			const caseData = createBaseCaseData({
				Contacts: [
					{
						contactTypeId: OBJECTOR_TYPE_ID,
						firstName: 'Obj',
						lastName: 'Ector',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					},
					{
						contactTypeId: APPLICANT_TYPE_ID,
						firstName: 'App',
						lastName: 'Licant',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					},
					{
						contactTypeId: AGENT_TYPE_ID,
						firstName: 'Ag',
						lastName: 'Ent',
						orgName: null,
						email: 'agent@test.com',
						telephoneNumber: null,
						Address: null,
						ObjectorStatus: null,
						ContactType: { displayName: 'Agent' }
					},
					{
						contactTypeId: 'supporter',
						firstName: 'Sup',
						lastName: 'Porter',
						orgName: null,
						email: null,
						telephoneNumber: null,
						Address: null,
						ObjectorStatus: null,
						ContactType: { displayName: 'Supporter' }
					}
				]
			});

			const result = mapContactListData(caseData as any);

			assert.strictEqual(result.contacts.length, 2);
			assert.strictEqual(result.contacts[0].firstName, 'Ag');
			assert.strictEqual(result.contacts[0].contactType, 'Agent');
			assert.strictEqual(result.contacts[1].firstName, 'Sup');
			assert.strictEqual(result.contacts[1].contactType, 'Supporter');
		});

		it('should return empty array when only objectors and applicants exist', () => {
			const caseData = createBaseCaseData({
				Contacts: [
					{
						contactTypeId: OBJECTOR_TYPE_ID,
						firstName: 'Obj',
						lastName: 'Ector',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					},
					{
						contactTypeId: APPLICANT_TYPE_ID,
						firstName: 'App',
						lastName: 'Licant',
						Address: null,
						ObjectorStatus: null,
						ContactType: null
					}
				]
			});

			const result = mapContactListData(caseData as any);

			assert.strictEqual(result.contacts.length, 0);
		});

		it('should include reference and case name', () => {
			const result = mapContactListData(createBaseCaseData() as any);

			assert.strictEqual(result.reference, 'DRT/2025/0001');
			assert.strictEqual(result.caseName, 'Test Drought Order');
			assert.ok(result.generatedDate instanceof Date);
		});
	});

	describe('mapDownloadableDocuments', () => {
		it('should map documents with their folder names', () => {
			const caseData = createBaseCaseData({
				Folders: [
					{
						displayName: 'Evidence',
						deletedAt: null,
						Documents: [
							{ fileName: 'report.pdf', blobName: 'case-1/blob-1', deletedAt: null },
							{ fileName: 'photo.jpg', blobName: 'case-1/blob-2', deletedAt: null }
						]
					},
					{
						displayName: 'Correspondence',
						deletedAt: null,
						Documents: [{ fileName: 'letter.docx', blobName: 'case-1/blob-3', deletedAt: null }]
					}
				]
			});

			const result = mapDownloadableDocuments(caseData as any);

			assert.strictEqual(result.length, 3);
			assert.deepStrictEqual(result[0], { fileName: 'report.pdf', blobName: 'case-1/blob-1', folderName: 'Evidence' });
			assert.deepStrictEqual(result[1], { fileName: 'photo.jpg', blobName: 'case-1/blob-2', folderName: 'Evidence' });
			assert.deepStrictEqual(result[2], {
				fileName: 'letter.docx',
				blobName: 'case-1/blob-3',
				folderName: 'Correspondence'
			});
		});

		it('should skip soft-deleted folders', () => {
			const caseData = createBaseCaseData({
				Folders: [
					{
						displayName: 'Active',
						deletedAt: null,
						Documents: [{ fileName: 'doc.pdf', blobName: 'case-1/blob-1', deletedAt: null }]
					},
					{
						displayName: 'Deleted Folder',
						deletedAt: new Date('2025-01-01'),
						Documents: [{ fileName: 'hidden.pdf', blobName: 'case-1/blob-2', deletedAt: null }]
					}
				]
			});

			const result = mapDownloadableDocuments(caseData as any);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].fileName, 'doc.pdf');
		});

		it('should skip soft-deleted documents', () => {
			const caseData = createBaseCaseData({
				Folders: [
					{
						displayName: 'Evidence',
						deletedAt: null,
						Documents: [
							{ fileName: 'active.pdf', blobName: 'case-1/blob-1', deletedAt: null },
							{ fileName: 'deleted.pdf', blobName: 'case-1/blob-2', deletedAt: new Date('2025-01-01') }
						]
					}
				]
			});

			const result = mapDownloadableDocuments(caseData as any);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].fileName, 'active.pdf');
		});

		it('should return empty array when no folders exist', () => {
			const result = mapDownloadableDocuments(createBaseCaseData() as any);

			assert.strictEqual(result.length, 0);
		});

		it('should return empty array when folders have no documents', () => {
			const caseData = createBaseCaseData({
				Folders: [{ displayName: 'Empty Folder', deletedAt: null, Documents: [] }]
			});

			const result = mapDownloadableDocuments(caseData as any);

			assert.strictEqual(result.length, 0);
		});
	});
});
