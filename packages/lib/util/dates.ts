import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Turns date string into 12 hour display
 */
export function dateISOStringToDisplayTime12hr(dateISOString: Date) {
	if (!dateISOString) {
		return '';
	}

	let displayTimeString;

	try {
		displayTimeString = formatInTimeZone(dateISOString, 'Europe/London', `h:mmaaa`);
	} catch {
		displayTimeString = '';
	}

	return displayTimeString;
}

/**
 * Converts date string into the day month year format
 */
export function dateISOStringToDisplayDate(dateISOString: Date, fallback = '') {
	if (!dateISOString) {
		return fallback;
	}

	let displayDateString;

	try {
		displayDateString = formatInTimeZone(dateISOString, 'Europe/London', 'd MMMM yyyy');
	} catch {
		displayDateString = '';
	}

	return displayDateString;
}

/**
 * Pulls day date from date string in GB format.
 */
export const getDayFromISODate = (isoDate: Date) => {
	if (!isoDate) {
		return '';
	}

	const dateInZone = toZonedTime(isoDate, 'Europe/London');
	return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(dateInZone);
};
