import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';

/**
 * Class for dynamically generating sections based on a manage list section parameter.
 *
 * Based on that manage list will create 1 section per item, attempting to adhere
 * to the display conditions (e.g. .withCondition() function calls etc.) of the section.
 *
 * To use this class you can either instantiate it whereveer you need it and call .build()
 * to generate the sections if you want to show exactly the questions you asked.
 *
 * Or, if you want to show slightly different data, or present the data in a combined way, then
 * you will need to extend this class and overwrite buildSection() but will still reuse pretty much
 * all the functions. An example is the OutcomeSectionBuilder
 */
export class DynamicSectionBuilder {
	protected listFieldName: string;
	protected manageListSection: Section;

	constructor(listFieldName: string, manageListSection: Section) {
		this.listFieldName = listFieldName;
		this.manageListSection = manageListSection;
	}

	/**
	 * Main "entry" function
	 */
	public build(journeyResponse: JourneyResponse): Section[] {
		const items = this.getItems(journeyResponse);

		if (!items.length) {
			return [];
		}

		this.flattenData(journeyResponse, items);

		return items.map((item, index) => this.buildSection(journeyResponse, item, index));
	}

	protected getItems(journeyResponse: JourneyResponse): Record<string, unknown>[] {
		return journeyResponse?.answers?.[this.listFieldName] || [];
	}

	/**
	 * Takes the data nested within the ManageListSection and flattens it, making
	 * sure to generate unique field names to avoid clashes.
	 */
	protected flattenData(journeyResponse: JourneyResponse, items: Record<string, unknown>[]): void {
		items.forEach((item: Record<string, unknown>, index: number) => {
			this.manageListSection.questions?.forEach((q: Question) => {
				const flatFieldName = this.getFlatFieldName(index, q.fieldName);
				journeyResponse.answers[flatFieldName] = item[q.fieldName] as Record<string, unknown>[];
			});
		});
	}

	/**
	 * Creates a new unique field name, as these items used to be nested within
	 * the ManageListSection but when flattened they will need something unique
	 * `<manageListParentFieldName>_<arrayIndex>_<actualItemFieldName>`
	 * e.g. outcomedDetails: [{ decisionMakerId: 1 }] -> `outcomeDetails_0_decisionMakerId: 1`
	 */
	protected getFlatFieldName(index: number, originalFieldName: string): string {
		return `${this.listFieldName}_${index}_${originalFieldName}`;
	}

	/**
	 * The title of the section, should be overwritten by any subclass that extends this.
	 */
	protected getSectionTitle(item: Record<string, unknown>, index: number): string {
		return `Item ${index + 1}`;
	}

	/**
	 * Builds a single section
	 */
	protected buildSection(journeyResponse: JourneyResponse, item: Record<string, unknown>, index: number): Section {
		const section = new Section(this.getSectionTitle(item, index), '');

		const localResponse = this.createLocalResponse(journeyResponse, item);

		this.manageListSection.questions?.forEach((q: Question) => {
			if (!q.shouldDisplay(localResponse)) {
				return;
			}

			const clonedQuestion = this.cloneQuestion(q, index);
			section.addQuestion(clonedQuestion);
		});

		return section;
	}

	/**
	 * Creates a fake response object to do condition checks. We need to do this because we
	 * have flattened and restructured the data
	 */
	protected createLocalResponse(journeyResponse: JourneyResponse, item: Record<string, unknown>): JourneyResponse {
		const localResponse = Object.create(journeyResponse);
		localResponse.answers = item;
		return localResponse;
	}

	/**
	 * Deep clones a question instance while preserving its prototype methods, whilst giving it
	 * a new unique fieldName, making it ineditable and giving it no url (as it is not editable url is not important).
	 */
	protected cloneQuestion(question: Question, index: number): Question {
		const flatFieldName = this.getFlatFieldName(index, question.fieldName);

		const clonedQuestion = Object.assign(Object.create(Object.getPrototypeOf(question)), question, {
			fieldName: flatFieldName,
			editable: false,
			url: ''
		});

		// We can hardcode this because we have returned out earlier if it evaluated to false.
		clonedQuestion.shouldDisplay = () => true;

		return clonedQuestion;
	}
}
