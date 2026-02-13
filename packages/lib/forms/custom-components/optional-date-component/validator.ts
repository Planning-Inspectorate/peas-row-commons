import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import type { ValidationChain } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import type { ContextRunningOptions } from 'express-validator/lib/chain/context-runner.js';

/**
 * Wraps the parent rules in a check.
 *
 * This check just makes sure that the user has answered
 * "something" before running them, this way if the user
 * answers nothing we can correctly let them pass (optional)
 * but if they entered "something" then we do all the rule
 * checks to make sure they haven't entered bad data.
 */
export default class OptionalDateValidator extends DateValidator {
	validate(questionObj: Question) {
		const originalRules = super.validate(questionObj) as ValidationChain[];

		const fieldName = questionObj.fieldName;
		const dayInput = `${fieldName}_day`;
		const monthInput = `${fieldName}_month`;
		const yearInput = `${fieldName}_year`;

		return originalRules.map((rule) => {
			const wrapper = async (req: Request, res: Response, next: NextFunction) => {
				const hasData = !!(req.body[dayInput] || req.body[monthInput] || req.body[yearInput]);

				if (!hasData) {
					return next();
				}

				return rule(req, res, next);
			};

			wrapper.run = async (req: Request, options?: ContextRunningOptions) => {
				const hasData = !!(req.body[dayInput] || req.body[monthInput] || req.body[yearInput]);

				if (!hasData) return { context: { errors: [] } };

				return rule.run(req, options);
			};

			return wrapper;
		});
	}
}
