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
				Applicant: true,
				Decision: true,
				Procedures: {
					include: {
						HearingVenue: true,
						InquiryVenue: true,
						ConferenceVenue: true
					}
				},
				Inspectors: true
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

		const finalAnswers = combineSessionAndDbData(res, answers);

		const questions = getQuestions(groupMembers);

		// put these on locals for the list controller
		res.locals.originalAnswers = { ...answers };
		res.locals.journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', finalAnswers);
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
 * Combines session data with Db data.
 * Merges arrays by matching IDs to prevent duplication of updated items.
 *
 * Should only combine if we are dealing with arrays on both ends (i.e. a ManageList),
 * normal data fields should behave as expected and just return the answers from the DB.
 *
 * Example:
 *
 * - You have added 3 inspectors
 * - You want to change inspector 2's name
 * - Previosly: doing so will show UI with the original 3 (as it is pulling the data from DB)
 * - Now: it will correctly show 3 inspectors with 2's name changed
 */
export function combineSessionAndDbData(res: Response, answers: Record<string, any>) {
	const finalAnswers = { ...answers };
	if (!res.locals.journeyResponse?.answers) return finalAnswers;

	const sessionAnswers = res.locals.journeyResponse.answers;

	Object.keys(sessionAnswers).forEach((key) => {
		const dbValue = answers[key];
		const sessionValue = sessionAnswers[key];

		if (Array.isArray(dbValue) && Array.isArray(sessionValue)) {
			finalAnswers[key] = mergeArraysById(dbValue, sessionValue);
		} else {
			finalAnswers[key] = sessionValue;
		}
	});
	return finalAnswers;
}

/**
 * Helper to merge two arrays
 *
 * If a session item has an ID that matches a DB item, it is merged with it to overwrite the different keys.
 *
 * If no match is found, it is appended as a new item.
 *
 * This is needed to avoid edited data being treated as a new piece of data.
 */
export function mergeArraysById(dbArray: any[], sessionArray: any[], idKey = 'id') {
	const merged = [...dbArray];

	sessionArray.forEach((sessionItem) => {
		const existingIndex = merged.findIndex(
			(dbItem) => dbItem[idKey] && sessionItem[idKey] && dbItem[idKey] === sessionItem[idKey]
		);

		if (existingIndex !== -1) {
			// If not found (-1) spread the two items together such that the new session data overwrites the key
			merged[existingIndex] = { ...merged[existingIndex], ...sessionItem };
		} else {
			merged.push(sessionItem);
		}
	});

	return merged;
}
