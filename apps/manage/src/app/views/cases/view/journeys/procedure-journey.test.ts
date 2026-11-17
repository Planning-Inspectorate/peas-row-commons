import { PROCEDURES_ID } from '@pins/peas-row-commons-database/src/seed/static-data/ids/procedures.ts';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { InspectorRadioConfig } from '../questions-procedure.ts';
import { buildProcedureManageList, getDynamicProcedureSections } from './procedure-journey.ts';

const config: InspectorRadioConfig = {
	inspectorGroupMembers: [],
	selected: [],
	userDisplayNames: new Map()
};

const siteVisitProcedure = { id: 'site-visit', procedureTypeId: PROCEDURES_ID.SITE_VISIT };
const otherProcedures = [
	{ id: 'hearing', procedureTypeId: PROCEDURES_ID.HEARING },
	{ id: 'inquiry', procedureTypeId: PROCEDURES_ID.INQUIRY },
	{ id: 'admin-in-house', procedureTypeId: PROCEDURES_ID.ADMIN_IN_HOUSE },
	{ id: 'written-representations', procedureTypeId: PROCEDURES_ID.WRITTEN_REPS }
];
const procedures = [siteVisitProcedure, ...otherProcedures];

describe('procedure journey', () => {
	describe('procedure manage list', () => {
		it('should include exactly one editable site visit type question', () => {
			const section = buildProcedureManageList(config);
			const questions = section.questions.filter((question) => question.fieldName === 'siteVisitTypeId');

			assert.strictEqual(questions.length, 1);
			assert.strictEqual(questions[0].editable, true);
			assert.strictEqual(questions[0].isInManageListSection, true);
		});

		it('should display the site visit type for a site visit procedure', () => {
			const section = buildProcedureManageList(config);
			const question = section.questions.find((question) => question.fieldName === 'siteVisitTypeId');
			assert.ok(question);
			const response = new JourneyResponse('test', 'case-1', siteVisitProcedure);

			assert.strictEqual(question.shouldDisplay(response), true);
		});

		for (const procedure of otherProcedures) {
			it(`should hide the site visit type for ${procedure.id}`, () => {
				const section = buildProcedureManageList(config);
				const question = section.questions.find((question) => question.fieldName === 'siteVisitTypeId');
				assert.ok(question);
				const response = new JourneyResponse('test', 'case-1', procedure);

				assert.strictEqual(question.shouldDisplay(response), false);
			});
		}
	});

	describe('dynamic procedure sections', () => {
		it('should create a section for every procedure when all supported types are present', () => {
			const sections = getDynamicProcedureSections(config, procedures);

			assert.deepStrictEqual(
				sections.map((section) => section.segment),
				procedures.map((procedure) => procedure.id)
			);
		});

		for (const procedure of procedures) {
			it(`should include one site visit type question and one site visit date question for ${procedure.id}`, () => {
				const sections = getDynamicProcedureSections(config, [procedure]);
				assert.strictEqual(sections.length, 1);
				const section = sections[0];
				const typeQuestions = section.questions.filter((question) => question.fieldName === 'siteVisitTypeId');
				const dateQuestions = section.questions.filter((question) => question.fieldName === 'siteVisitDate');

				assert.strictEqual(typeQuestions.length, 1);
				assert.strictEqual(dateQuestions.length, 1);
				assert.strictEqual(typeQuestions[0].isInManageListSection, false);
			});

			it(`should display the site visit type for ${procedure.id}`, () => {
				const [section] = getDynamicProcedureSections(config, [procedure]);
				assert.ok(section);
				const question = section.questions.find((question) => question.fieldName === 'siteVisitTypeId');
				assert.ok(question);
				const response = new JourneyResponse('test', 'case-1', procedure);

				assert.strictEqual(question.shouldDisplay(response), true);
			});
		}

		it('should make the site visit type read-only for a site visit procedure', () => {
			const [section] = getDynamicProcedureSections(config, [siteVisitProcedure]);
			assert.ok(section);
			const question = section.questions.find((question) => question.fieldName === 'siteVisitTypeId');
			assert.ok(question);

			assert.strictEqual(question.editable, false);
		});

		for (const procedure of otherProcedures) {
			it(`should make the site visit type editable for ${procedure.id}`, () => {
				const [section] = getDynamicProcedureSections(config, [procedure]);
				assert.ok(section);
				const question = section.questions.find((question) => question.fieldName === 'siteVisitTypeId');
				assert.ok(question);

				assert.strictEqual(question.editable, true);
			});
		}

		it('should create no sections when procedures are omitted or empty', () => {
			assert.deepStrictEqual(getDynamicProcedureSections(config), []);
			assert.deepStrictEqual(getDynamicProcedureSections(config, []), []);
		});
	});
});
