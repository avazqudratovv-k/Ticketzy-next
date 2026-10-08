import { DEFAULT_TIMEZONE } from '../format';

const FALLBACK = [
	'Asia/Seoul', 'Asia/Tashkent', 'Asia/Samarkand', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Bangkok',
	'Asia/Dubai', 'Asia/Almaty', 'Asia/Kolkata', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Europe/Istanbul',
	'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

export interface ZoneOption {
	id: string;
	/** "GMT+9" now, for the label and the search ("+9", "gmt+9") */
	offset: string;
	/** lower case text the search looks in: id with spaces, offset */
	haystack: string;
}

/** Every IANA zone the browser knows (about 400), or a short fallback list on old browsers. */
export function listTimezones(): ZoneOption[] {
	let ids: string[] = FALLBACK;
	try {
		const all = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone');
		if (all?.length) ids = all.includes('UTC') ? all : [...all, 'UTC'];
	} catch {
		ids = FALLBACK;
	}
	const now = new Date();
	return ids.map((id) => {
		let offset = '';
		try {
			offset = new Intl.DateTimeFormat('en', { timeZone: id, timeZoneName: 'short' }).formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? '';
		} catch {
			offset = '';
		}
		return { id, offset, haystack: `${id.replace(/[_/]/g, ' ')} ${offset}`.toLowerCase() };
	});
}

export const defaultTimezone = DEFAULT_TIMEZONE;

export function isTimezone(value: string): boolean {
	try {
		new Intl.DateTimeFormat('en', { timeZone: value });
		return true;
	} catch {
		return false;
	}
}
