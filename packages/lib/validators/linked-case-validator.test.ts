import type { JourneyResponse, Question } from '@planning-inspectorate/dynamic-forms';
import assert from 'assert';
import type { FieldValidationError } from 'express-validator';
import { describe, it } from 'node:test';
import { LinkedCasesLeadValidator } from './linked-case-validator.ts';

/** Minimal Question stub */
function makeQuestion(overrides: Partial<Question> = {}): Question {
	return {
		fieldName: 'leadCaseId',
		bodyFieldNames: ['leadCaseId'],
		...overrides
	} as unknown as Question;
}

/** Minimal express-like request stub */
function makeReq(overrides: Record<string, unknown> = {}) {
	return {
		body: {},
		params: {},
		cookies: {},
		headers: {},
		...overrides
	};
}

/** Runs the returned validation chain against a fake req and returns errors */
async function runValidation(
	validator: LinkedCasesLeadValidator,
	question: Question,
	journeyResponse: JourneyResponse,
	req: ReturnType<typeof makeReq>
) {
	const [chain] = validator.validate(question, journeyResponse);
	const result = await chain.run(req as never);
	// express-validator's Result-ish object
	return result;
}

describe('LinkedCasesLeadValidator', () => {
	describe('constructor', () => {
		it('throws when dependencyFieldName is missing', () => {
			assert.throws(
				() =>
					new LinkedCasesLeadValidator({
						validationFunction: () => true
					} as never),
				/dependencyFieldName/
			);
		});

		it('throws when validationFunction is missing', () => {
			assert.throws(
				() =>
					new LinkedCasesLeadValidator({
						dependencyFieldName: 'linkedCases'
					} as never),
				/validationFunction/
			);
		});

		it('throws when validationFunction is not a function', () => {
			assert.throws(
				() =>
					new LinkedCasesLeadValidator({
						dependencyFieldName: 'linkedCases',
						validationFunction: 42 as never
					}),
				/validationFunction/
			);
		});

		it('assigns properties on success', () => {
			const fn = () => true;
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: fn
			});
			assert.strictEqual(v.dependencyFieldName, 'linkedCases');
			assert.strictEqual(v.validationFunction, fn);
		});
	});

	describe('validate()', () => {
		it('returns an array with one validation chain', () => {
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: () => true
			});
			const chains = v.validate(makeQuestion(), {} as JourneyResponse);
			assert.ok(Array.isArray(chains));
			assert.strictEqual(chains.length, 1);
		});

		it('passes when validationFunction returns true', async () => {
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: () => true
			});
			const req = makeReq({ body: { leadCaseId: 'ABC' } });
			const result = await runValidation(
				v,
				makeQuestion(),
				{ answers: { linkedCases: [{ id: '1' }] } } as unknown as JourneyResponse,
				req
			);
			assert.strictEqual(result.isEmpty(), true);
		});

		it('fails with descriptive error when validationFunction returns false', async () => {
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: () => false
			});
			const req = makeReq({ body: { leadCaseId: 'ABC' } });
			const result = await runValidation(
				v,
				makeQuestion(),
				{ answers: { linkedCases: [{ id: '1' }] } } as unknown as JourneyResponse,
				req
			);
			assert.strictEqual(result.isEmpty(), false);
			const [err] = result.array();
			assert.match(err.msg, /leadCaseId.*linkedCases/);
		});

		it('defaults dependency answer to [] when not an array', async () => {
			let receivedDep: unknown;
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: (_c, d) => {
					receivedDep = d;
					return true;
				}
			});
			await runValidation(
				v,
				makeQuestion(),
				{ answers: { linkedCases: 'not-an-array' } } as unknown as JourneyResponse,
				makeReq({ body: { leadCaseId: 'ABC' } })
			);
			assert.deepStrictEqual(receivedDep, []);
		});

		it('defaults answers to {} when journeyResponse.answers is missing', async () => {
			let receivedDep: unknown;
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: (_c, d) => {
					receivedDep = d;
					return true;
				}
			});
			await runValidation(v, makeQuestion(), {} as JourneyResponse, makeReq({ body: { leadCaseId: 'ABC' } }));
			assert.deepStrictEqual(receivedDep, []);
		});

		it('filters out dependency item whose id matches manageListItemId', async () => {
			let receivedDep: Array<{ id: string }> = [];
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: (_c, d) => {
					receivedDep = d as Array<{ id: string }>;
					return true;
				}
			});
			await runValidation(
				v,
				makeQuestion(),
				{
					answers: { linkedCases: [{ id: '1' }, { id: '2' }, { id: '3' }] }
				} as unknown as JourneyResponse,
				makeReq({ body: { leadCaseId: 'ABC' }, params: { manageListItemId: '2' } })
			);
			assert.deepStrictEqual(receivedDep, [{ id: '1' }, { id: '3' }]);
		});

		it('uses req.body[fieldName] when question has no getDataToSave', async () => {
			let receivedCurrent: unknown;
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: (c) => {
					receivedCurrent = c;
					return true;
				}
			});
			await runValidation(
				v,
				makeQuestion(),
				{ answers: { linkedCases: [] } } as unknown as JourneyResponse,
				makeReq({ body: { leadCaseId: 'FROM-BODY' } })
			);
			assert.strictEqual(receivedCurrent, 'FROM-BODY');
		});

		it('uses formattedAnswers[fieldName] from getDataToSave when present', async () => {
			let receivedCurrent: unknown;
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: (c) => {
					receivedCurrent = c;
					return true;
				}
			});
			const question = makeQuestion({
				getDataToSave: async () => ({ answers: { leadCaseId: 'FROM-GDS' } })
			} as Partial<Question>);
			await runValidation(
				v,
				question,
				{ answers: { linkedCases: [] } } as unknown as JourneyResponse,
				makeReq({ body: { leadCaseId: 'FROM-BODY' } })
			);
			assert.strictEqual(receivedCurrent, 'FROM-GDS');
		});

		it('falls back to whole formattedAnswers when fieldName not in it', async () => {
			let receivedCurrent: unknown;
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: (c) => {
					receivedCurrent = c;
					return true;
				}
			});
			const formatted = { somethingElse: 'x' };
			const question = makeQuestion({
				getDataToSave: async () => ({ answers: formatted })
			} as Partial<Question>);
			await runValidation(
				v,
				question,
				{ answers: { linkedCases: [] } } as unknown as JourneyResponse,
				makeReq({ body: {} })
			);
			assert.deepStrictEqual(receivedCurrent, formatted);
		});

		it('uses first bodyFieldNames entry as the bound body field', async () => {
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: () => false
			});
			const question = makeQuestion({
				fieldName: 'leadCaseId',
				bodyFieldNames: ['leadCaseId_custom']
			});
			const result = await runValidation(
				v,
				question,
				{ answers: { linkedCases: [] } } as unknown as JourneyResponse,
				makeReq({ body: { leadCaseId_custom: 'x' } })
			);
			const [err] = result.array() as FieldValidationError[];
			assert.strictEqual(err.path, 'leadCaseId_custom');
		});

		it('falls back to fieldName when bodyFieldNames is absent', async () => {
			const v = new LinkedCasesLeadValidator({
				dependencyFieldName: 'linkedCases',
				validationFunction: () => false
			});
			const question = makeQuestion({ bodyFieldNames: undefined });
			const result = await runValidation(
				v,
				question,
				{ answers: { linkedCases: [] } } as unknown as JourneyResponse,
				makeReq({ body: { leadCaseId: 'x' } })
			);
			const [err] = result.array() as FieldValidationError[];
			assert.strictEqual(err.path, 'leadCaseId');
		});
	});
});
