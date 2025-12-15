import { formatInTimeZone } from 'date-fns-tz';

const TIME_ZONE = 'Europe/London';

/**
 * Wrapper to handle missing data, fallbacks, error checkls etc.
 */
function formatLondonDate(date: Date, formatPattern: string, fallback = '') {
	if (!date) {
		return fallback;
	}

	try {
		return formatInTimeZone(date, TIME_ZONE, formatPattern);
	} catch {
		return fallback;
	}
}

/**
 * Turns date string into 12 hour display
 */
export function dateISOStringToDisplayTime12hr(dateISOString: Date) {
	return formatLondonDate(dateISOString, 'h:mmaaa');
}

/**
 * Converts date string into the day month year format
 */
export function dateISOStringToDisplayDate(dateISOString: Date, fallback = '') {
	return formatLondonDate(dateISOString, 'd MMMM yyyy', fallback);
}

/**
 * Pulls day date from date string in GB format.
 */
export function getDayFromISODate(isoDate: Date) {
	return formatLondonDate(isoDate, 'EEEE');
}
