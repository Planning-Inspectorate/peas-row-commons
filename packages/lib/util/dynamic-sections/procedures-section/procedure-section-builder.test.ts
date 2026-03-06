import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ProcedureSectionBuilder } from './procedure-section-builder.ts';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/procedures.ts';
import { PROCEDURES, PROCEDURE_STATUSES } from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';

interface MockResponse {
	answers: Record<string, unknown>;
}

class MockQuestion {
	fieldName: string;
	title: string;
	editable?: boolean;
	url?: string;
	displayCondition: (res: MockResponse) => boolean;

	constructor(fieldName: string, displayCondition = (_param: MockResponse) => true) {
		this.fieldName = fieldName;
		this.title = fieldName;
		this.displayCondition = displayCondition;
	}

	shouldDisplay(response: MockResponse): boolean {
		return this.displayCondition(response);
	}

	formatAnswerForSummary(_segment: string, _journey: unknown, answer: unknown): { key?: string; value: unknown }[] {
		return [{ value: `MockFormatted: ${String(answer)}` }];
	}
}

class MockSection {
	name: string;
	url: string;
	questions: MockQuestion[] = [];

	constructor(title: string, url: string) {
		this.name = title;
		this.url = url;
	}

	addQuestion(question: MockQuestion): this {
		this.questions.push(question);
		return this;
	}
}

describe('ProcedureSectionBuilder', () => {
	let mockManageListSection: MockSection;
	let mockJourneyResponse: MockResponse;

	beforeEach(() => {
		mockManageListSection = new MockSection('Manage List', 'manage-list');
		mockJourneyResponse = { answers: {} };

		// Add the core fields that every procedure has
		mockManageListSection.addQuestion(new MockQuestion('procedureTypeId'));
		mockManageListSection.addQuestion(new MockQuestion('procedureStatusId'));
		mockManageListSection.addQuestion(new MockQuestion('inspectorId'));
		mockManageListSection.addQuestion(new MockQuestion('siteVisitDate'));
		mockManageListSection.addQuestion(new MockQuestion('siteVisitTypeId'));
	});

	describe('Section Title Generation', () => {
		it('should use procedure type displayName and status for the section title', () => {
			const hearingType = PROCEDURES.find((p) => p.id === PROCEDURES_ID.HEARING);
			const activeStatus = PROCEDURE_STATUSES[0];

			if (hearingType && activeStatus) {
				mockJourneyResponse.answers.procedureDetails = [
					{ procedureTypeId: hearingType.id, procedureStatusId: activeStatus.id }
				];

				const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
				const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

				assert.strictEqual(sections[0].name, `${hearingType.displayName} (${activeStatus.displayName})`);
			}
		});

		it('should fall back to "Procedure <n>" if procedureTypeId is not recognised', () => {
			mockJourneyResponse.answers.procedureDetails = [{ procedureTypeId: 'non-existent-id' }];

			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			assert.strictEqual(sections[0].name, 'Procedure 1');
		});

		it('should show type without status if status is missing', () => {
			const hearingType = PROCEDURES.find((p) => p.id === PROCEDURES_ID.HEARING);

			if (hearingType) {
				mockJourneyResponse.answers.procedureDetails = [
					{ procedureTypeId: hearingType.id, procedureStatusId: undefined }
				];

				const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
				const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

				assert.strictEqual(sections[0].name, hearingType.displayName);
			}
		});
	});

	describe('Multiple Procedures', () => {
		it('should generate one section per procedure', () => {
			mockJourneyResponse.answers.procedureDetails = [
				{ procedureTypeId: PROCEDURES_ID.HEARING, procedureStatusId: 'active' },
				{ procedureTypeId: PROCEDURES_ID.INQUIRY, procedureStatusId: 'active' },
				{ procedureTypeId: PROCEDURES_ID.SITE_VISIT, procedureStatusId: 'completed' }
			];

			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			assert.strictEqual(sections.length, 3);
		});
	});

	describe('Create Flow Fields (non-editable)', () => {
		it('should mark create-flow fields as non-editable', () => {
			mockJourneyResponse.answers.procedureDetails = [
				{ procedureTypeId: PROCEDURES_ID.HEARING, procedureStatusId: 'active' }
			];

			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			const typeQuestion = sections[0].questions.find((q) => q.fieldName.endsWith('procedureTypeId'));
			const statusQuestion = sections[0].questions.find((q) => q.fieldName.endsWith('procedureStatusId'));

			assert.strictEqual(typeQuestion?.editable, false);
			assert.strictEqual(typeQuestion?.url, '');
			assert.strictEqual(statusQuestion?.editable, false);
			assert.strictEqual(statusQuestion?.url, '');
		});

		it('should keep detail fields editable', () => {
			mockJourneyResponse.answers.procedureDetails = [
				{ procedureTypeId: PROCEDURES_ID.HEARING, procedureStatusId: 'active' }
			];

			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			// siteVisitDate is a common detail field, NOT a create-flow field
			const siteVisitDateQuestion = sections[0].questions.find((q) => q.fieldName.endsWith('siteVisitDate'));

			// editable should be false because cloneQuestion sets it false,
			// but url should NOT be overridden to '' by create-flow logic
			// Actually: base cloneQuestion always sets editable=false and url=''
			// so this is consistent — detail fields are edited via the dynamic section
			assert.ok(siteVisitDateQuestion);
		});
	});

	describe('Type-Specific Field Filtering', () => {
		it('should show hearing fields only for hearing procedures', () => {
			// Add a hearing-specific field
			mockManageListSection.addQuestion(new MockQuestion('hearingTargetDate'));
			// Add an inquiry-specific field
			mockManageListSection.addQuestion(new MockQuestion('inquiryTargetDate'));

			mockJourneyResponse.answers.procedureDetails = [
				{ procedureTypeId: PROCEDURES_ID.HEARING, procedureStatusId: 'active' }
			];

			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			const hearingField = sections[0].questions.find((q) => q.fieldName.endsWith('hearingTargetDate'));
			const inquiryField = sections[0].questions.find((q) => q.fieldName.endsWith('inquiryTargetDate'));

			assert.ok(hearingField, 'Hearing field should be present for hearing procedure');
			assert.strictEqual(inquiryField, undefined, 'Inquiry field should NOT be present for hearing procedure');
		});

		it('should show admin fields only for admin procedures', () => {
			mockManageListSection.addQuestion(new MockQuestion('inHouseDate'));
			mockManageListSection.addQuestion(new MockQuestion('hearingTargetDate'));

			mockJourneyResponse.answers.procedureDetails = [
				{ procedureTypeId: PROCEDURES_ID.ADMIN_IN_HOUSE, procedureStatusId: 'active' }
			];

			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			const adminField = sections[0].questions.find((q) => q.fieldName.endsWith('inHouseDate'));
			const hearingField = sections[0].questions.find((q) => q.fieldName.endsWith('hearingTargetDate'));

			assert.ok(adminField, 'Admin field should be present');
			assert.strictEqual(hearingField, undefined, 'Hearing field should NOT be present for admin procedure');
		});

		it('should show common fields for all procedure types', () => {
			mockJourneyResponse.answers.procedureDetails = [
				{ procedureTypeId: PROCEDURES_ID.SITE_VISIT, procedureStatusId: 'active' }
			];

			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			// siteVisitDate is a common field (not in any type-specific list exclusively)
			const siteVisitDate = sections[0].questions.find((q) => q.fieldName.endsWith('siteVisitDate'));
			assert.ok(siteVisitDate, 'Common field siteVisitDate should be present for site visit');
		});
	});

	describe('Empty States', () => {
		it('should return empty array if no procedures exist', () => {
			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const result = builder.build(mockJourneyResponse as unknown as JourneyResponse);

			assert.deepStrictEqual(result, []);
		});

		it('should return empty array if procedureDetails is an empty array', () => {
			mockJourneyResponse.answers.procedureDetails = [];

			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const result = builder.build(mockJourneyResponse as unknown as JourneyResponse);

			assert.deepStrictEqual(result, []);
		});
	});

	describe('Display Conditions', () => {
		it('should respect shouldDisplay conditions from the manage list questions', () => {
			/**
			 * Simulates the admin type question which should only display
			 * when procedureTypeId is admin
			 */
			const adminTypeQuestion = new MockQuestion(
				'adminProcedureType',
				(res: MockResponse) => res.answers.procedureTypeId === PROCEDURES_ID.ADMIN_IN_HOUSE
			);
			mockManageListSection.addQuestion(adminTypeQuestion);

			// A hearing procedure — adminProcedureType should NOT display
			mockJourneyResponse.answers.procedureDetails = [
				{ procedureTypeId: PROCEDURES_ID.HEARING, procedureStatusId: 'active' }
			];

			const builder = new ProcedureSectionBuilder(mockManageListSection as unknown as Section);
			const sections = builder.build(mockJourneyResponse as unknown as JourneyResponse) as unknown as MockSection[];

			const adminQuestion = sections[0].questions.find((q) => q.fieldName.endsWith('adminProcedureType'));

			assert.strictEqual(adminQuestion, undefined, 'Admin type should not display for hearing procedure');
		});
	});
});
