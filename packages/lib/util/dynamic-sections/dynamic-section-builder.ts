import { Section, type JourneyResponse, type Question } from '@planning-inspectorate/dynamic-forms';

/**
 * Class for dynamically generating sections based on a manage list section parameter.
 *
 * Based on that manage list will create 1 section per item, attempting to adhere
 * to the display conditions (e.g. .withCondition() function calls etc.) of the section.
 *
 * To use this class you can either instantiate it wherever you need it and call .build()
 * to generate the sections if you want to show exactly the questions you asked.
 *
 * Or, if you want to show slightly different data, or present the data in a combined way, then
 * you will need to extend this class and overwrite buildSection() but will still reuse pretty much
 * all the functions. An example is the OutcomeSectionBuilder.
 *
 * TODO HRP-652 reconsider this entire functionality as it goes against dynamic forms design patterns.
 * The user is presented with a list of uneditable questions that are not actually questions, but just a way to display
 * data. It is not clear to the user how they can edit the data. Also this code is hard to understand and maintain.
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
		const items = journeyResponse?.answers?.[this.listFieldName];
		if (Array.isArray(items)) {
			return items as Record<string, unknown>[];
		}
		return [];
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
	 *
	 * NOTE: this returns a Proxy, not a plain object copy. dynamic-forms' `Question` (and many of
	 * its subclasses, e.g. `RadioQuestion`, `SelectQuestion`, `ManageListQuestion`,
	 * `ConditionalOptionsQuestion`) rely on native JS private class fields/methods (`#field`).
	 * Private fields/methods are only initialised on an object when it is actually constructed via
	 * `new SomeClass(...)` - a plain `Object.create()`/`Object.assign()` clone never gets that
	 * "brand", so calling any inherited method that touches a private field/method on such a clone
	 * throws `TypeError: Receiver must be an instance of class Question`.
	 *
	 * Instead, the returned Proxy:
	 * - returns the overridden values directly for the overridden keys (fieldName/editable/url/shouldDisplay)
	 * - delegates every other property/method to the REAL, correctly-branded `question` instance,
	 *   temporarily patching the overridden (non-function) properties onto it for the duration of
	 *   each (synchronous) method call, so methods that read `this.fieldName` etc. see the cloned
	 *   value while still having full access to their private fields/methods.
	 */
	protected cloneQuestion(question: Question, index: number): Question {
		const flatFieldName = this.getFlatFieldName(index, question.fieldName);

		return DynamicSectionBuilder.createQuestionProxy(question, {
			fieldName: flatFieldName,
			editable: false,
			url: '',
			shouldDisplay: () => true
		});
	}

	/**
	 * Builds a Proxy over `question` that presents `initialOverrides` for property reads, whilst
	 * always invoking methods against the real `question` instance so private fields/methods keep
	 * working. See {@link DynamicSectionBuilder.cloneQuestion} for the full rationale.
	 */
	protected static createQuestionProxy(question: Question, initialOverrides: Record<string, unknown>): Question {
		const target = question as unknown as Record<string, unknown>;
		// Values returned directly when read - bypasses the real target entirely.
		const overrides: Record<string, unknown> = { ...initialOverrides };
		// Keys of `overrides` (data properties AND function replacements) that get temporarily
		// patched onto the real `target` object for the duration of any delegated method call, so
		// methods relying on `this.<key>` (including other methods calling `this.someOverriddenFn()`
		// internally) see the overridden value whilst still being invoked with `this` bound to the
		// real, branded object.
		const patchKeys = new Set(Object.keys(initialOverrides));

		// Proxy is a wrapper for the target question instance, so that we can override some properties
		return new Proxy(question, {
			// Intercepts property reads, returning the override if present, otherwise delegating to the real target.
			get(_targetObj, prop) {
				// If the property is a string and exists in the overrides, return the override value
				if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(overrides, prop)) {
					return overrides[prop];
				}

				// Otherwise, delegate to the real target.
				const value = Reflect.get(target, prop, target);

				// If the value is not a function, return it directly.
				if (typeof value !== 'function') {
					return value;
				}

				// If the value is a function, return a wrapper that temporarily patches the overrides onto the target.
				return function (...args: unknown[]) {
					const saved: Record<string, unknown> = {};
					const hadOwn = new Set<string>();

					// Patch the overrides onto the target, saving the original values.
					for (const key of patchKeys) {
						if (Object.prototype.hasOwnProperty.call(target, key)) {
							hadOwn.add(key);
						}
						saved[key] = target[key];
						target[key] = overrides[key];
					}

					// Call the original function with the target as `this`, and restore the original values afterwards.
					try {
						return value.apply(target, args);
					} finally {
						for (const key of patchKeys) {
							if (hadOwn.has(key)) {
								target[key] = saved[key];
							} else {
								delete target[key];
							}
						}
					}
				};
			},
			// Intercepts property writes, storing the value in the overrides if it's a string key, otherwise delegating to the real target.
			// We don't expect to be writing to the question instance since these clones are only used to display values, but this is here for completeness.
			set(_targetObj, prop, value) {
				if (typeof prop === 'string') {
					overrides[prop] = value;
					patchKeys.add(prop);
					return true;
				}
				return Reflect.set(target, prop, value);
			}
		}) as unknown as Question;
	}
}
