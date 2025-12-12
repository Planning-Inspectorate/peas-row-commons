import { list } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import { notFoundHandler } from '@pins/peas-row-commons-lib/middleware/errors.ts';
import { caseToViewModel } from './view-model.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { isValidUuidFormat } from '@pins/peas-row-commons-lib/util/uuid.ts';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import { ManageService } from '#service';
import type { Request, Response, NextFunction } from 'express';
import { getQuestions } from './questions.ts';

export function buildViewCaseDetails(): AsyncRequestHandler {
	return async (req, res) => {
		const reference = res.locals?.journeyResponse?.answers?.reference;
		const caseName = res.locals?.journeyResponse?.answers?.name;

		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}

		const caseUpdated = readCaseUpdatedSession(req, id);

		// Clear updated flag if present so that we only see it once.
		clearCaseUpdatedSession(req, id);

		const baseUrl = req.baseUrl;

		await list(req, res, '', {
			reference,
			caseName,
			baseUrl,
			backLinkUrl: res.locals.backLinkUrl || '/cases',
			caseUpdated
		});
	};
}

export function validateIdFormat(req: Request, res: Response, next: NextFunction) {
	const id = req.params.id;

	if (!id) {
		throw new Error('id param required');
	}

	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}

	next();
}

export function buildGetJourneyMiddleware(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res, next) => {
		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}

		logger.info({ id }, 'view case');

		const caseToView = await db.case.findUnique({
			where: { id },
			include: {
				SiteAddress: true,
				SubType: true,
				Type: true,
				Dates: true
			}
		});

		if (caseToView === null) {
			return notFoundHandler(req, res);
		}

		const answers = caseToViewModel(caseToView);

		const questions = getQuestions();

		// put these on locals for the list controller
		res.locals.originalAnswers = { ...answers };
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', answers);
		res.locals.journey = createJourney(questions, res.locals.journeyResponse, req);

		if (req.originalUrl !== req.baseUrl) {
			// back link goes to details page
			// only if not on the details page
			res.locals.backLinkUrl = req.baseUrl;
		}

		if (next) next();
	};
}

/**
 * Read a case updated flag from the session
 */
function readCaseUpdatedSession(req: Request, id: string) {
	if (!req.session) {
		return false;
	}
	const caseProps = (req.session?.cases && req.session.cases[id]) || {};
	return Boolean(caseProps.updated);
}

/**
 * Clear a case updated flag from the session
 */
function clearCaseUpdatedSession(req: Request, id: string) {
	if (!req.session) {
		return; // no need to error here
	}

	if (id === '__proto__' || id === 'constructor' || id === 'prototype') {
		throw new Error('invalid id for object, prototype pollution');
	}

	if (req.session?.cases?.[id]) {
		delete req.session.cases[id].updated;
	}
}
