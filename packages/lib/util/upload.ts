export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0B';

	const KIB: number = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'] as const;

	const unitIndex = Math.floor(Math.log(bytes) / Math.log(KIB));
	const value = Math.round(bytes / Math.pow(KIB, unitIndex));

	return `${value}${sizes[unitIndex]}`;
}

export function encodeBlobNameToBase64(blobName: string): string {
	return Buffer.from(blobName, 'utf8').toString('base64url');
}

export function formatExtensions(allowedExtensions: string[]): string {
	const upper = allowedExtensions.map((ext) => ext.toUpperCase());
	if (upper.length <= 1) return upper[0] || '';
	return `${upper.slice(0, -1).join(', ')}, or ${upper.at(-1)}`;
}
