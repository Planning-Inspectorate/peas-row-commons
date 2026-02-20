import { DynamicSectionBuilder } from '../dynamic-section-builder.ts';
import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { DECISION_TYPES } from '@pins/peas-row-commons-database/src/seed/static_data/decision-type.ts';
import { DECISION_MAKER_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/decision-maker-type.ts';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';

/**
 * Dynamically generated sections based on number of Outcome(s).
 *
 * Unlike the vanilla DynamicSectionBuilder, this class wants to
 * hide various questions / combine a couple into 1 unique "question",
 * so we override the build section function to achieve this logic.
 */
export class OutcomeSectionBuilder extends DynamicSectionBuilder {
	constructor(manageListSection: Section) {
		super('outcomeDetails', manageListSection);
	}

	/**
	 * The heading of the sections should just be the type of decision (e.g. "Interim")
	 */
	protected override getSectionTitle(item: Record<string, unknown>, index: number): string {
		return DECISION_TYPES.find((type) => type.id === item.decisionTypeId)?.displayName || `Outcome ${index + 1}`;
	}

	/**
	 * Builds an individual section, hides some questions that we don't want to see and combines some others into
	 * one.
	 */
	protected override buildSection(
		journeyResponse: JourneyResponse,
		item: Record<string, unknown>,
		index: number
	): Section {
		const section = new Section(this.getSectionTitle(item, index), '');

		const localResponse = this.createLocalResponse(journeyResponse, item);

		const fieldsToHide = [
			'decisionTypeId',
			'decisionMakerTypeId',
			'decisionMakerInspectorId',
			'decisionMakerOfficerId'
		];

		this.manageListSection.questions?.forEach((q: Question) => {
			if (q.fieldName === 'decisionMakerTypeId') {
				const originatorQuestion = this.cloneQuestion(q, index);
				originatorQuestion.title = 'Originator';

				originatorQuestion.formatAnswerForSummary = () => {
					return [
						{
							key: 'Originator',
							value: this.formatOriginator(item)
						}
					];
				};

				section.addQuestion(originatorQuestion);
				return;
			}

			if (fieldsToHide.includes(q.fieldName)) {
				return;
			}

			if (!q.shouldDisplay(localResponse)) {
				return;
			}

			const clonedQuestion = this.cloneQuestion(q, index);
			section.addQuestion(clonedQuestion);
		});

		return section;
	}

	/**
	 * Formats the "Originator" question, which is a fake question that is the combination of either
	 * Inspector, Officer, or Secretary of State.
	 *
	 * Following format:
	 *
	 * Inspector
	 * <name> <- derived from inspector input
	 *
	 * Officer
	 * <name> <- derived from officer input
	 *
	 * Secreatory of State
	 */
	private formatOriginator(item: Record<string, unknown>): string {
		const getFormattedName = (role: string, fieldName: string): string => {
			const question = this.manageListSection.questions?.find((q) => q.fieldName === fieldName);

			if (question && item[fieldName]) {
				const mockJourney = {
					response: { answers: item },
					getCurrentQuestionUrl: () => '',
					answers: item
				} as Journey;
				const formatted = question.formatAnswerForSummary('', mockJourney, item[fieldName]);
				return `${role}<br>${formatted[0]?.value || ''}`;
			}

			return role;
		};

		switch (item.decisionMakerTypeId) {
			case DECISION_MAKER_TYPE_ID.OFFICER:
				return getFormattedName('Officer', 'decisionMakerOfficerId');

			case DECISION_MAKER_TYPE_ID.INSPECTOR:
				return getFormattedName('Inspector', 'decisionMakerInspectorId');

			case DECISION_MAKER_TYPE_ID.SECRETARY_OF_STATE:
				return 'Secretary of State';

			default:
				return '—';
		}
	}
}
