/** Locale-aware, timezone-aware formatters. Everything goes through Intl; the time zone is always explicit,
 *  so the server and the browser print the same text. */

const INTL_LOCALES: Record<string, string> = { en: 'en-GB', ko: 'ko-KR', ru: 'ru-RU', uz: 'uz-Latn-UZ' };
export const intlLocale = (locale?: string) => INTL_LOCALES[locale ?? 'en'] ?? 'en-GB';

export const DEFAULT_TIMEZONE = 'Asia/Seoul';

const safeZone = (timeZone?: string | null) => {
	if (!timeZone) return DEFAULT_TIMEZONE;
	try {
		new Intl.DateTimeFormat('en', { timeZone });
		return timeZone;
	} catch {
		return DEFAULT_TIMEZONE;
	}
};

/**
 * Browsers and Node ship no usable Uzbek date data (Intl prints "M11 8, Sun"), so Uzbek dates are composed by hand
 * from the calendar day in the venue's zone. Every other language goes through Intl.
 */
const UZ_MONTHS = [
	'yanvar',
	'fevral',
	'mart',
	'aprel',
	'may',
	'iyun',
	'iyul',
	'avgust',
	'sentabr',
	'oktabr',
	'noyabr',
	'dekabr',
];
const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

function uzDate(date: Date, timeZone: string, withYear: boolean, weekday = true): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
	}).formatToParts(date);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	const day = get('day');
	const month = UZ_MONTHS[get('month') - 1];
	const dow = UZ_WEEKDAYS[new Date(Date.UTC(get('year'), get('month') - 1, day)).getUTCDay()];
	const head = weekday ? `${dow[0].toUpperCase()}${dow.slice(1)}, ` : '';
	return `${head}${day}-${month}${withYear ? `, ${get('year')}` : ''}`;
}

export function formatPrice(amount: number, locale?: string, currency = 'KRW'): string {
	try {
		return new Intl.NumberFormat(intlLocale(locale), {
			style: 'currency',
			currency,
			currencyDisplay: 'narrowSymbol',
			maximumFractionDigits: currency === 'KRW' || currency === 'UZS' ? 0 : 2,
		}).format(amount);
	} catch {
		return `${amount} ${currency}`;
	}
}

export const formatNumber = (value: number, locale?: string) => new Intl.NumberFormat(intlLocale(locale)).format(value);

/** "Sat, 14 Nov · 20:00" in the venue's time zone. */
export function formatEventDate(iso: string, locale?: string, timeZone?: string | null, withYear = false): string {
	const zone = safeZone(timeZone);
	const loc = intlLocale(locale);
	const date =
		locale === 'uz'
			? uzDate(new Date(iso), zone, withYear)
			: new Intl.DateTimeFormat(loc, {
					timeZone: zone,
					weekday: 'short',
					day: 'numeric',
					month: 'short',
					...(withYear ? { year: 'numeric' } : {}),
			  }).format(new Date(iso));
	return `${date} · ${formatEventTime(iso, locale, zone)}`;
}

export function formatEventTime(iso: string, locale?: string, timeZone?: string | null): string {
	return new Intl.DateTimeFormat(intlLocale(locale), {
		timeZone: safeZone(timeZone),
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(new Date(iso));
}

/** "GMT+9" for the venue's zone at that moment. */
export function formatZoneName(iso: string, locale: string | undefined, timeZone?: string | null): string {
	const part = new Intl.DateTimeFormat('en', { timeZone: safeZone(timeZone), timeZoneName: 'short' })
		.formatToParts(new Date(iso))
		.find((p) => p.type === 'timeZoneName');
	return part?.value ?? safeZone(timeZone);
}

/** Short date for comments and the like. Uses the viewer's zone-independent UTC day to stay stable on the server. */
export function formatShortDate(iso: string, locale?: string): string {
	if (locale === 'uz') return uzDate(new Date(iso), DEFAULT_TIMEZONE, true, false);
	return new Intl.DateTimeFormat(intlLocale(locale), {
		timeZone: DEFAULT_TIMEZONE,
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	}).format(new Date(iso));
}

/**
 * Refund policy (backend DECISIONS #55): refunds are possible until 23:59 on the day before the event starts,
 * on the wall clock of the venue. Returns that day as a localized date.
 */
export function formatRefundDeadlineDay(startIso: string, locale?: string, timeZone?: string | null): string {
	const zone = safeZone(timeZone);
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: zone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(new Date(startIso));
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	// A calendar day minus one, computed on UTC so it is not affected by any DST shift
	const dayBefore = new Date(Date.UTC(get('year'), get('month') - 1, get('day') - 1));
	if (locale === 'uz') return uzDate(dayBefore, 'UTC', true);
	return new Intl.DateTimeFormat(intlLocale(locale), {
		timeZone: 'UTC',
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(dayBefore);
}

/** Value for an `<input type="date">` boundary: start or end of that day on Seoul time (the platform default). */
export const dayBoundaryIso = (day: string, end: boolean) => `${day}T${end ? '23:59:59.999' : '00:00:00.000'}+09:00`;
