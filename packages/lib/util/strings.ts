/**
 * Module for all utils strings related.
 */

/**
 * Takes a string and converts it to kebab-case
 */
export function stringToKebab(string: string): string {
	if (!string) return '';
	return string
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[\W_]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

/**
 * Check that answer string is under certain character length
 */
export function checkAnswerlength(value: string, errorMessage: string, pageLink: string, length = 150) {
	if (value?.length > length) {
		return {
			text: errorMessage,
			href: pageLink
		};
	}
}

/**
 * Checks if a provided string is not empty, returns an error ready object if it is empty.
 */
export function checkRequiredAnswer(value: string, errorMessage: string, pageLink: string) {
	if (typeof value === 'undefined' || value === '' || value === null) {
		return {
			text: errorMessage,
			href: pageLink
		};
	}
}

/**
 * The max length standard for a case note comment.
 */
const COMMENT_MAX_LENGTH = 100;

/**
 * Converts string to camelCase
 */
export const toCamelCase = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);

/**
 * Checks if comment is big enough to warrant truncating
 */
export function shouldTruncateComment(comment: string, maxLength = COMMENT_MAX_LENGTH) {
	return comment?.length > maxLength;
}

/**
 * Truncates a comment adding an ellipsis + a "Read more" link
 */
export function truncateComment(comment: string, href: string, maxLength = COMMENT_MAX_LENGTH) {
	if (shouldTruncateComment(comment, maxLength)) {
		const truncated = comment.substring(0, maxLength);
		return `${truncated}... ${truncatedReadMoreCommentLink(href)}`;
	}
	return comment;
}

/**
 * Generates a "Read more" link
 */
export function truncatedReadMoreCommentLink(href: string) {
	return `<a class="govuk-link govuk-link--no-visited-state" href="${href}">Read more</a>`;
}

/**
 * replaces new line chars with a <br>
 */
export function nl2br(value: string) {
	if (!value) return '';

	return value.replace(/\r\n|\n/g, '<br>');
}
