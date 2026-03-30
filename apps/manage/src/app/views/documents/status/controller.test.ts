import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import type { Logger } from 'pino';
import type { ManageService } from '#service';
import { buildToggleDocumentAction } from './controller.ts';

interface MockSession {
	account?: {
		localAccountId?: string;
	};
}

interface MockRequest {
	session?: MockSession;
	body: Record<string, string | undefined>;
	get: (name: string) => string | undefined;
}

interface MockResponse {
	redirectUrl?: string;
	redirect: (url: string) => void;
}

interface PrismaCreateData {
	readStatus: boolean;
	flaggedStatus: boolean;
	Document: { connect: { id: string } };
	User: { connectOrCreate: { where: { idpUserId: string } } };
}

interface PrismaCreateArgs {
	data: PrismaCreateData;
}

interface PrismaUpdateArgs {
	where: { id: string };
	data: {
		readStatus: boolean;
		flaggedStatus: boolean;
	};
}

describe('buildToggleDocumentAction', () => {
	let mockReq: MockRequest;
	let mockRes: MockResponse;
	let capturedError: Error | null;
	let mockNext: NextFunction;

	let lastCreateArgs: PrismaCreateArgs | null;
	let lastUpdateArgs: PrismaUpdateArgs | null;
	let mockDb: ManageService['db'];
	let mockLogger: Logger;

	beforeEach(() => {
		capturedError = null;
		mockNext = ((err?: Error) => {
			capturedError = err ?? null;
		}) as NextFunction;

		mockReq = {
			session: { account: { localAccountId: 'user-123' } },
			body: {},
			get: function (name: string) {
				return this.body[name];
			}
		};

		mockRes = {
			redirectUrl: '',
			redirect: function (url: string) {
				this.redirectUrl = url;
			}
		};

		lastCreateArgs = null;
		lastUpdateArgs = null;

		mockDb = {
			case: {
				findUnique: (async () => ({ legacyCaseId: '', statusId: 'test-status' })) as unknown
			},
			userDocument: {
				findFirst: (async () => null) as unknown,
				update: (async (args: unknown) => {
					lastUpdateArgs = args as PrismaUpdateArgs;
					return {};
				}) as unknown,
				create: (async (args: unknown) => {
					lastCreateArgs = args as PrismaCreateArgs;
					return {};
				}) as unknown
			}
		} as unknown as ManageService['db'];

		mockLogger = {
			info: () => {},
			error: () => {}
		} as unknown as Logger;
	});

	const getController = () => buildToggleDocumentAction({ db: mockDb, logger: mockLogger } as ManageService);

	it('should call next with an error if user session is missing', async () => {
		mockReq.session = undefined;
		mockReq.body = { caseId: 'case-1', markReadToggle: 'doc-1' };

		const controller = getController();
		await controller(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

		assert.ok(capturedError);
		assert.strictEqual(capturedError?.message, 'userId required for updating document status');
	});

	it('should call next with an error if documentId or caseId are missing', async () => {
		mockReq.body = { caseId: 'case-1' };

		const controller = getController();
		await controller(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

		assert.ok(capturedError);
		assert.strictEqual(capturedError?.message, 'documentId and caseId required for updating document status');
	});

	it('should call next with an error if the case is not found in the database', async () => {
		mockReq.body = { caseId: 'case-1', markReadToggle: 'doc-1' };

		mockDb.case.findUnique = (async () => null) as unknown as typeof mockDb.case.findUnique;

		const controller = getController();
		await controller(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

		assert.ok(capturedError);
		assert.strictEqual(capturedError?.message, 'Unable to find case row for id: case-1');
	});

	it('should CREATE a new UserDocument row if one does not exist', async () => {
		mockReq.body = { caseId: 'case-1', markReadToggle: 'doc-1' };
		mockDb.userDocument.findFirst = (async () => null) as unknown as typeof mockDb.userDocument.findFirst;

		const controller = getController();
		await controller(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

		assert.strictEqual(capturedError, null);
		assert.ok(lastCreateArgs);

		if (lastCreateArgs) {
			assert.strictEqual(lastCreateArgs.data.readStatus, true);
			assert.strictEqual(lastCreateArgs.data.Document.connect.id, 'doc-1');
			assert.strictEqual(lastCreateArgs.data.User.connectOrCreate.where.idpUserId, 'user-123');
		}
	});

	it('should UPDATE an existing UserDocument row if it already exists', async () => {
		mockReq.body = { caseId: 'case-1', flagToggle: 'doc-1' };

		mockDb.userDocument.findFirst = (async () => ({
			id: 'row-999',
			readStatus: true,
			flaggedStatus: false
		})) as unknown as typeof mockDb.userDocument.findFirst;

		const controller = getController();
		await controller(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

		assert.strictEqual(capturedError, null);
		assert.ok(lastUpdateArgs);

		if (lastUpdateArgs) {
			assert.strictEqual(lastUpdateArgs.where.id, 'row-999');
			assert.strictEqual(lastUpdateArgs.data.readStatus, true);
			assert.strictEqual(lastUpdateArgs.data.flaggedStatus, true);
		}
	});

	it('should redirect back to fallback case URL if no returnUrl is provided', async () => {
		mockReq.body = { caseId: 'case-1', markReadToggle: 'doc-1' };

		const controller = getController();
		await controller(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

		assert.strictEqual(capturedError, null);
		assert.strictEqual(mockRes.redirectUrl, '/cases/case-1#row-doc-1');
	});

	it('should redirect back to a safe relative returnUrl', async () => {
		mockReq.body = { caseId: 'case-1', markReadToggle: 'doc-1', returnUrl: '/cases/case-1/documents' };

		const controller = getController();
		await controller(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

		assert.strictEqual(capturedError, null);
		assert.strictEqual(mockRes.redirectUrl, '/cases/case-1/documents#row-doc-1');
	});

	it('should block unsafe absolute URLs and fallback to the case dashboard', async () => {
		mockReq.body = {
			caseId: 'case-1',
			markReadToggle: 'doc-1',
			returnUrl: 'https://www.malicious-third-party-website-123-aaec-eeete-ascrr4-553fo.com'
		};

		const controller = getController();
		await controller(mockReq as unknown as Request, mockRes as unknown as Response, mockNext);

		assert.strictEqual(capturedError, null);
		assert.strictEqual(mockRes.redirectUrl, '/cases/case-1#row-doc-1');
	});
});
