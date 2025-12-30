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
import { clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import { getEntraGroupMembers } from '#util/entra-groups.ts';

export function buildViewCaseDetails(): AsyncRequestHandler {
	return async (req, res) => {
		const reference = res.locals?.journeyResponse?.answers?.reference;
		const caseName = res.locals?.journeyResponse?.answers?.name;
		const caseNotes = res.locals?.journeyResponse?.answers?.caseNotes;

		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}

		const caseUpdated = readSessionData(req, id, 'updated', false);

		// Clear updated flag if present so that we only see it once.
		clearSessionData(req, id, 'updated');

		const errors = readSessionData(req, id, 'updateErrors', [], 'cases');
		if (!(typeof errors === 'boolean') && errors.length > 0) {
			res.locals.errorSummary = errors;
		}
		clearSessionData(req, id, 'updateErrors', 'cases');

		const baseUrl = req.baseUrl;

		await list(req, res, '', {
			reference,
			caseName,
			notes: caseNotes || [],
			baseUrl,
			backLinkUrl: res.locals.backLinkUrl || '/cases',
			caseUpdated,
			currentUrl: req.originalUrl
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
	const { db, logger, getEntraClient } = service;
	const groupId = service.authConfig.groups.applicationAccess;

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
				Dates: true,
				Costs: true,
				Abeyance: true,
				Notes: true,
				Authority: true,
				Applicant: true
			}
		});

		if (caseToView === null) {
			return notFoundHandler(req, res);
		}

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupId
		});

		const answers = caseToViewModel(caseToView, groupMembers);

		const questions = getQuestions(groupMembers);

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
