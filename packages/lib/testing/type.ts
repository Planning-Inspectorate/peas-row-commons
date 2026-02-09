import type { Mock } from 'node:test';

export interface MockResponse {
	render: Mock<(view: string, options: any) => void>;
	redirect: Mock<(url: string) => void>;
	status: Mock<(code: number) => MockResponse>;
	send: Mock<(body?: unknown) => void>;
}

export interface MockDb {
	document: {
		count: Mock<(args: { where: any }) => Promise<number>>;
		findMany: Mock<(args: { where: any; include?: any; skip?: number; take?: number }) => Promise<any[]>>;
	};
	$transaction: Mock<(promises: Promise<any>[]) => Promise<any[]>>;
}
