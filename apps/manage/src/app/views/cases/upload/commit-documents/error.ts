/**
 * Error for when a user attempts to upload 0 files.
 */
export class NoUploadsError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = 'NoUploadsError';
	}
}
