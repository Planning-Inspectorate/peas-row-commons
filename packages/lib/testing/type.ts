import type { Mock } from 'node:test';

export interface MockResponse {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO HRP-710 typing for test mocks
	render: Mock<(view: string, options: any) => void>;
	redirect: Mock<(url: string) => void>;
	status: Mock<(code: number) => MockResponse>;
	send: Mock<(body?: unknown) => void>;
}

export interface MockDb {
	document: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO HRP-710 typing for test mocks
		count: Mock<(args: { where: any }) => Promise<number>>;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO HRP-710 typing for test mocks
		findMany: Mock<(args: { where: any; include?: any; skip?: number; take?: number }) => Promise<any[]>>;
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO HRP-710 typing for test mocks
	$transaction: Mock<(promises: Promise<any>[]) => Promise<any[]>>;
}
