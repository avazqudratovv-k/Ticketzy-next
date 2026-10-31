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
export const UZ_MONTHS = [
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
export const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

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

/** "Sat, 12 Dec 2026" in the venue's time zone. */
export function formatEventDay(iso: string, locale?: string, timeZone?: string | null): string {
	const zone = safeZone(timeZone);
	if (locale === 'uz') return uzDate(new Date(iso), zone, true);
	return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

/** "10 Oct" (no weekday, no year) on the venue's calendar: the short date of the "Sales start" chip. */
export function formatShortDay(iso: string, locale?: string, timeZone?: string | null): string {
	const zone = safeZone(timeZone);
	if (locale === 'uz') return uzDate(new Date(iso), zone, false, false);
	return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: zone, day: 'numeric', month: 'short' }).format(new Date(iso));
}

/** Weekday and date, clock time and the venue's zone (e.g. "Asia/Seoul") of an instant: the parts of a sales-start line. */
export const formatSalesMoment = (iso: string, locale?: string, timeZone?: string | null) => ({
	day: formatEventDay(iso, locale, timeZone),
	time: formatEventTime(iso, locale, timeZone),
	zone: safeZone(timeZone),
});

export function formatEventTime(iso: string, locale?: string, timeZone?: string | null): string {
	return new Intl.DateTimeFormat(intlLocale(locale), {
		timeZone: safeZone(timeZone),
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(new Date(iso));
}

/** Calendar day and clock time of an instant on the venue's wall clock. */
function wallOf(iso: string, zone: string): { date: string; time: string } {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
	return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}
const nextCalendarDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

/**
 * Convention: a multi-day event is the same daily hours on every day from the first day to the last one
 * (start = first day at the start time, end = last day at the end time). A show that runs past midnight
 * (ends the next day, earlier on the clock) is still one day.
 */
export function isMultiDay(startIso?: string | null, endIso?: string | null, timeZone?: string | null): boolean {
	if (!startIso || !endIso) return false;
	const zone = safeZone(timeZone);
	const start = wallOf(startIso, zone);
	const end = wallOf(endIso, zone);
	if (start.date === end.date) return false;
	return !(end.date === nextCalendarDay(start.date) && end.time < start.time);
}

const DAILY: Record<string, string> = { en: 'daily', ko: '매일', ru: 'ежедневно', uz: 'har kuni' };

/** "12–14 Dec 2026", "28 Dec 2026 – 2 Jan 2027". The year is left out only when asked and both days are in one year. */
function formatDayRange(startIso: string, endIso: string, locale: string | undefined, zone: string, withYear: boolean): string {
	const start = new Date(startIso);
	const end = new Date(endIso);
	const a = wallOf(startIso, zone).date;
	const b = wallOf(endIso, zone).date;
	const sameYear = a.slice(0, 4) === b.slice(0, 4);
	const year = withYear || !sameYear;
	if (locale === 'uz') {
		// No usable Uzbek date data in Intl (see uzDate)
		if (a.slice(0, 7) === b.slice(0, 7)) return `${Number(a.slice(8))}–${uzDate(end, zone, year, false)}`;
		return `${uzDate(start, zone, !sameYear, false)} – ${uzDate(end, zone, year, false)}`;
	}
	return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: zone, day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) }).formatRange(start, end);
}

const hours = (startIso: string, endIso: string, locale: string | undefined, zone: string) =>
	`${formatEventTime(startIso, locale, zone)}–${formatEventTime(endIso, locale, zone)}`;

/**
 * Where an event shows its time: a one-day event is "Sat, 14 Nov · 20:00" (unchanged),
 * a multi-day one is "12–14 Dec · daily 19:00–22:00".
 */
export function formatEventWhen(startIso: string, endIso: string | null | undefined, locale?: string, timeZone?: string | null, withYear = false): string {
	if (!endIso || !isMultiDay(startIso, endIso, timeZone)) return formatEventDate(startIso, locale, timeZone, withYear);
	const zone = safeZone(timeZone);
	return `${formatDayRange(startIso, endIso, locale, zone, withYear)} · ${DAILY[locale ?? 'en'] ?? DAILY.en} ${hours(startIso, endIso, locale, zone)}`;
}

/** The organizer form's summary line, always with the year and ending with the time zone name. */
export function formatEventSummary(startIso: string, endIso: string, locale?: string, timeZone?: string | null): string {
	const zone = safeZone(timeZone);
	const when = isMultiDay(startIso, endIso, zone)
		? `${formatDayRange(startIso, endIso, locale, zone, true)} · ${DAILY[locale ?? 'en'] ?? DAILY.en} ${hours(startIso, endIso, locale, zone)}`
		: `${formatEventDay(startIso, locale, zone)} · ${hours(startIso, endIso, locale, zone)}`;
	return `${when} (${zone})`;
}

/** "GMT+9" for the venue's zone at that moment. */
export function formatZoneName(iso: string, _locale: string | undefined, timeZone?: string | null): string {
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

/** Value for an `<input type="date">` boundary: start or end of that day on Seoul time (the platform default). */
export const dayBoundaryIso = (day: string, end: boolean) => `${day}T${end ? '23:59:59.999' : '00:00:00.000'}+09:00`;

/**
 * A moment that belongs to the viewer (purchase time, notification time), printed in the viewer's own time zone.
 * Only call this after mount (data that needs a signed-in member), so server and browser never disagree.
 */
export function formatViewerDate(iso: string, locale?: string, withTime = false): string {
	const zone = safeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
	const date =
		locale === 'uz'
			? uzDate(new Date(iso), zone, true, false)
			: new Intl.DateTimeFormat(intlLocale(locale), { timeZone: zone, day: 'numeric', month: 'short', year: 'numeric' }).format(
					new Date(iso),
			  );
	return withTime ? `${date}, ${formatEventTime(iso, locale, zone)}` : date;
}

/**
 * A moment printed on platform time (Asia/Seoul) with its zone label: "17 Oct 2026, 11:39 GMT+9". For admin records
 * that must read the same on every computer (the browser's own zone and its daylight saving are not used).
 */
export function formatPlatformMoment(iso: string, locale?: string): string {
	const zone = DEFAULT_TIMEZONE;
	const date =
		locale === 'uz'
			? uzDate(new Date(iso), zone, true, false)
			: new Intl.DateTimeFormat(intlLocale(locale), { timeZone: zone, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
	return `${date}, ${formatEventTime(iso, locale, zone)} ${formatZoneName(iso, locale, zone)}`;
}

/** Whole calendar days between a moment and now on the viewer's clock: 0 today, 1 yesterday. */
export function daysAgo(iso: string): number {
	const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
	return Math.round((day(new Date()) - day(new Date(iso))) / 86_400_000);
}

/** "2 Oct" (or "2 Oct 2025") on the viewer's clock, for lists. */
export function formatViewerDay(iso: string, locale?: string, withYear = false): string {
	const zone = safeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
	if (locale === 'uz') return uzDate(new Date(iso), zone, withYear, false);
	return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: zone, day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(new Date(iso));
}
