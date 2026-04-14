import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';
import { INSPECTOR_CONSTANTS } from '@pins/peas-row-commons-lib/constants/inspectors.ts';
import { addSessionData, clearSessionData, readSessionData } from '@pins/peas-row-commons-lib/util/session.ts';
import type { RequestHandler } from 'express';
import {
	PROCEDURE_STATUSES,
	PROCEDURES,
	DECISION_TYPES
} from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';

const SESSION_ERROR_KEY = 'removalError';
const SESSION_NAMESPACE = 'inspectorDetails';

export interface ProcedureItem {
	inspectorId?: string;
	procedureTypeId?: string;
	procedureStatusId?: string;
}
export interface OutcomeItem {
	decisionMakerInspectorId?: string;
	decisionTypeId?: string;
}
export interface ErrorListItem {
	text: string;
	href: string;
}

const getProcedureName = (id?: string) => PROCEDURES.find((item) => item.id === id)?.displayName;
const getProcedureStatus = (id?: string) => PROCEDURE_STATUSES.find((item) => item.id === id)?.displayName;
const getOutcomeName = (id?: string) => DECISION_TYPES.find((item) => item.id === id)?.displayName;

/**
 * If we are removing an inspector, we must first check that the inspector is not currently
 * assigned to anything on the case, like a Procedure or an Outcome.
 *
 * If they are then we must error and ask them to remedy this before attempting to remove.
 */
export const validateInspectorRemoval: RequestHandler = (req, res, next) => {
	const { manageListAction, manageListItemId, question: manageListQuestion, id, section } = req.params;

	if (
		manageListAction !== MANAGE_LIST_ACTIONS.REMOVE ||
		!manageListItemId ||
		manageListQuestion !== INSPECTOR_CONSTANTS.INSPECTOR_URL
	) {
		return next();
	}

	const {
		procedureDetails = [],
		outcomeDetails = [],
		inspectorDetails = []
	} = res.locals.journeyResponse?.answers || {};

	const inspectorIdToRemove = (inspectorDetails as Record<string, unknown>[]).find(
		(i) => i.id === manageListItemId
	)?.inspectorId;
	if (!inspectorIdToRemove) return next();

	const sameUserCount = (inspectorDetails as Record<string, unknown>[]).filter(
		(i) => i.inspectorId === inspectorIdToRemove
	).length;

	// We only care about validating the removal of an inspector if they are the last one
	if (sameUserCount > 1) {
		return next();
	}

	const assignedOutcomes = (outcomeDetails as OutcomeItem[]).filter(
		(outcome) => outcome.decisionMakerInspectorId === inspectorIdToRemove
	);

	const assignedProcedures = (procedureDetails as ProcedureItem[]).filter(
		(procedure) => procedure.inspectorId === inspectorIdToRemove
	);

	if (assignedProcedures.length === 0 && assignedOutcomes.length === 0) {
		return next();
	}

	const errorListItems = buildRemovalErrorSummary(assignedProcedures, assignedOutcomes);

	addSessionData(req, id, { [SESSION_ERROR_KEY]: errorListItems }, SESSION_NAMESPACE);

	const inspectorsUrl = `/cases/${id}/${section}/${INSPECTOR_CONSTANTS.INSPECTOR_URL}`;
	return res.redirect(inspectorsUrl);
};

/**
 *  Checks for unique "remove" errors on the Inspector Details
 */
export const checkForInspectorErrors: RequestHandler = (req, res, next) => {
	const { question: manageListQuestion, id } = req.params;

	if (manageListQuestion === INSPECTOR_CONSTANTS.INSPECTOR_URL) {
		const removeInspectorErrors = readSessionData(req, id, SESSION_ERROR_KEY, [], SESSION_NAMESPACE);

		if (Array.isArray(removeInspectorErrors) && removeInspectorErrors.length > 0) {
			res.locals.errorSummary = removeInspectorErrors;
		}

		clearSessionData(req, id, SESSION_ERROR_KEY, SESSION_NAMESPACE);
	}

	next();
};

/**
 * Generates the error strings for when an Inspector is already assigned to a Procedure or Outcome.
 */
export const buildRemovalErrorSummary = (
	procedures: ProcedureItem[],
	outcomes: OutcomeItem[],
	errorHref: string = '#remove'
): ErrorListItem[] => {
	const errorListItems: ErrorListItem[] = [];

	procedures.forEach((p) => {
		const name = getProcedureName(p.procedureTypeId) || 'Procedure';
		const status = getProcedureStatus(p.procedureStatusId) || 'unknown status';
		errorListItems.push({
			text: `Inspector is assigned to ${name} (${status}) so cannot be removed.`,
			href: errorHref
		});
	});

	outcomes.forEach((o) => {
		const name = getOutcomeName(o.decisionTypeId) || 'Outcome';
		errorListItems.push({
			text: `Inspector is assigned to ${name} so cannot be removed.`,
			href: errorHref
		});
	});

	if (procedures.length > 0 || outcomes.length > 0) {
		let finalInstruction = '';
		if (procedures.length > 0 && outcomes.length > 0) {
			finalInstruction =
				'You must assign a different inspector to the procedure(s) and outcome(s) before you can remove them from the case.';
		} else if (procedures.length > 0) {
			finalInstruction = `You must assign a different inspector to the ${procedures.length > 1 ? 'procedures' : 'procedure'} before you can remove them from the case.`;
		} else if (outcomes.length > 0) {
			finalInstruction = `You must assign a different inspector to the ${outcomes.length > 1 ? 'outcomes' : 'outcome'} before you can remove them from the case.`;
		}

		errorListItems.push({ text: finalInstruction, href: errorHref });
	}

	return errorListItems;
};
