/**
 * Download case controller.
 *
 * Orchestrates the full case download flow:
 * 1. Fetch case data from the database
 * 2. Resolve user display names from Entra ID
 * 3. Generate three PDFs (case details, objector list, contact list)
 * 4. Fetch all case documents from Azure Blob Storage
 * 5. Stream everything as a zip file to the user
 * 6. Record the download in case history (audit)
 */

import type { Request, Response } from 'express';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/peas-row-commons-lib/util/async-handler.ts';
import type { PrismaClient } from '@pins/peas-row-commons-database/src/client/client.ts';
import type { Logger } from 'pino';
import nunjucks from 'nunjucks';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import {
	getOrLaunchBrowser,
	generatePdf,
	fetchCaseForDownload,
	mapCaseDetailsData,
	mapObjectorListData,
	mapContactListData,
	mapDownloadableDocuments,
	streamCaseZip
} from './index.ts';
import type { CaseDownloadQueryResult } from './query.ts';
import { AUDIT_ACTIONS } from '../../../audit/index.ts';

/**
 * Relative template paths from the configured Nunjucks views dir
 * (set up in apps/manage/src/nunjucks.ts). The global Nunjucks
 * environment already knows how to find these.
 */
const TEMPLATE_BASE = 'views/cases/case-download/views';

const PDF_TEMPLATES = [
	{ template: `${TEMPLATE_BASE}/case-details.njk`, fileName: 'Case details.pdf' },
	{ template: `${TEMPLATE_BASE}/objector-list.njk`, fileName: 'Objector list.pdf' },
	{ template: `${TEMPLATE_BASE}/contact-list.njk`, fileName: 'Contact list.pdf' }
] as const;

/**
 * Builds the download case controller.
 */
export function buildDownloadCase(service: ManageService): AsyncRequestHandler {
	const { db, logger, blobStore, audit, archiverFactory } = service;
	const groupIds = service.entraGroupIds;

	return async (req: Request, res: Response) => {
		const { id } = req.params;

		if (!id) {
			throw new Error('Case ID parameter is required for download');
		}

		logger.info({ caseId: id }, 'Starting case download');

		const caseData = await fetchCaseData(db, id, logger);
		if (!caseData) return;

		const { caseOfficerName, inspectorNames } = await resolveEntraDisplayNames(
			service,
			req.session,
			groupIds,
			caseData,
			logger
		);

		const templateDataMap = mapDataToTemplates(caseData, caseOfficerName, inspectorNames);

		const generatedPdfs = await generateAllPdfs(templateDataMap, id, logger);

		const documents = mapDownloadableDocuments(caseData);
		logger.info({ caseId: id, documentCount: documents.length }, 'Documents mapped for download');

		registerAuditOnFinish(res, audit, id, req, logger);

		await streamCaseZip(res, caseData.reference, generatedPdfs, documents, blobStore, logger, archiverFactory);
	};
}

/**
 * Fetches case data, returns null if the case is not found.
 */
async function fetchCaseData(db: PrismaClient, id: string, logger: Logger) {
	const caseData = await fetchCaseForDownload(db, id);

	if (!caseData) {
		logger.warn({ caseId: id }, 'Case not found for download');
		return null;
	}

	logger.info({ caseId: id, reference: caseData.reference }, 'Case data fetched for download');
	return caseData;
}

/**
 * Resolves human-readable names for the case officer and inspectors from Entra ID.
 */
async function resolveEntraDisplayNames(
	service: ManageService,
	session: Request['session'],
	groupIds: ManageService['entraGroupIds'],
	caseData: CaseDownloadQueryResult,
	logger: Logger
) {
	const groupMembers = await getEntraGroupMembers({
		logger,
		initClient: service.getEntraClient,
		session,
		groupIds
	});

	const caseOfficerIdpId = caseData.CaseOfficer?.idpUserId;
	const caseOfficerName = caseOfficerIdpId
		? groupMembers.caseOfficers.find((m) => m.id === caseOfficerIdpId)?.displayName
		: undefined;

	// TODO: User lookup needs updating.
	// Future ticket will change this to look up from a generic users list,
	// since inspectors can move roles and may not be in the caseOfficers group.
	const inspectorNames = new Map<string, string>();
	for (const member of groupMembers.inspectors) {
		inspectorNames.set(member.id, member.displayName);
	}

	return { caseOfficerName, inspectorNames };
}

/**
 * Maps case data into the three PDF template data objects.
 */
function mapDataToTemplates(
	caseData: CaseDownloadQueryResult,
	caseOfficerName: string | undefined,
	inspectorNames: Map<string, string>
): Record<string, object> {
	return {
		[`${TEMPLATE_BASE}/case-details.njk`]: mapCaseDetailsData(caseData, caseOfficerName, inspectorNames),
		[`${TEMPLATE_BASE}/objector-list.njk`]: mapObjectorListData(caseData),
		[`${TEMPLATE_BASE}/contact-list.njk`]: mapContactListData(caseData)
	};
}

/**
 * Renders each template to HTML via the global Nunjucks environment,
 * then generates a PDF buffer for each.
 */
async function generateAllPdfs(
	templateDataMap: Record<string, object>,
	caseId: string,
	logger: Logger
): Promise<Array<{ fileName: string; buffer: Buffer }>> {
	const browser = await getOrLaunchBrowser(logger);
	const generatedPdfs: Array<{ fileName: string; buffer: Buffer }> = [];

	for (const { template, fileName } of PDF_TEMPLATES) {
		logger.info({ template, caseId }, `Rendering PDF: ${fileName}`);

		const html = nunjucks.render(template, templateDataMap[template]);
		const pdfBuffer = await generatePdf(browser, html, logger);

		generatedPdfs.push({ fileName, buffer: pdfBuffer });
	}

	logger.info({ caseId, pdfCount: generatedPdfs.length }, 'All PDFs generated');
	return generatedPdfs;
}

/**
 * Registers audit recording on response finish — only fires for completed downloads.
 * Aborted or errored downloads don't reach the 'finish' event, so aren't audited.
 */
function registerAuditOnFinish(
	res: Response,
	audit: ManageService['audit'],
	caseId: string,
	req: Request,
	logger: Logger
) {
	res.on('finish', async () => {
		try {
			await audit.record({
				caseId,
				action: AUDIT_ACTIONS.CASE_DOWNLOADED,
				userId: req?.session?.account?.localAccountId
			});
			logger.info({ caseId }, 'Case download recorded in audit history');
		} catch (auditError) {
			logger.error({ error: auditError, caseId }, 'Failed to record case download in audit');
		}
	});
}
