/**
 * Pure helpers of the date field (`DateField`): the typed format, the calendar grid and the names follow the site language,
 * never the computer's settings (F356). Values are `YYYY-MM-DD` strings, exactly what `<input type="date">` gave before,
 * so the URL and the server input are unchanged. Days are plain numbers on UTC, so no time zone or DST can shift them.
 */
import { intlLocale, UZ_MONTHS, UZ_WEEKDAYS } from './format';

export type DateLocale = 'en' | 'ko' | 'ru' | 'uz';
const norm = (locale?: string): DateLocale => (locale === 'ko' || locale === 'ru' || locale === 'uz' ? locale : 'en');

/** Order of day, month and year as typed and shown. */
const ORDER: Record<DateLocale, ('y' | 'm' | 'd')[]> = { en: ['m', 'd', 'y'], ko: ['y', 'm', 'd'], ru: ['d', 'm', 'y'], uz: ['d', 'm', 'y'] };
const PLACEHOLDERS: Record<DateLocale, string> = { en: 'mm/dd/yyyy', ko: '연도. 월. 일.', ru: 'дд.мм.гггг', uz: 'kk.oo.yyyy' };
/** 0 = Sunday, 1 = Monday */
const WEEK_START: Record<DateLocale, 0 | 1> = { en: 0, ko: 0, ru: 1, uz: 1 };
const UZ_WEEKDAYS_SHORT = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];

export const datePlaceholder = (locale?: string) => PLACEHOLDERS[norm(locale)];
export const weekStart = (locale?: string) => WEEK_START[norm(locale)];

const pad = (n: number) => String(n).padStart(2, '0');
export const toIso = (y: number, m: number, d: number) => `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;

export interface Ymd {
	y: number;
	m: number;
	d: number;
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export const isRealDay = (y: number, m: number, d: number) => {
	if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
	return d <= daysInMonth(y, m);
};

export function parseIso(value: string | null | undefined): Ymd | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
	if (!match) return null;
	const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
	return isRealDay(y, m, d) ? { y, m, d } : null;
}

/** "10/16/2026", "2026. 10. 16.", "16.10.2026" */
export function formatDateValue(value: string, locale?: string): string {
	const ymd = parseIso(value);
	if (!ymd) return '';
	const l = norm(locale);
	const [y, m, d] = [String(ymd.y), pad(ymd.m), pad(ymd.d)];
	if (l === 'en') return `${m}/${d}/${y}`;
	if (l === 'ko') return `${y}. ${ymd.m}. ${ymd.d}.`;
	return `${d}.${m}.${y}`;
}

/** What the visitor typed, in the site's order, to `YYYY-MM-DD`; also accepts the ISO form. `null` when it is not a real day. */
export function parseDateText(text: string, locale?: string): string | null {
	const trimmed = text.trim();
	const iso = parseIso(trimmed);
	if (iso) return toIso(iso.y, iso.m, iso.d);
	const parts = trimmed.split(/\D+/).filter(Boolean);
	if (parts.length !== 3) return null;
	const order = ORDER[norm(locale)];
	const yearText = parts[order.indexOf('y')];
	// a year needs four digits: "16.10.26" is more likely a slip than the year 26
	if (yearText.length !== 4) return null;
	const [y, m, d] = [Number(yearText), Number(parts[order.indexOf('m')]), Number(parts[order.indexOf('d')])];
	return isRealDay(y, m, d) ? toIso(y, m, d) : null;
}

/** Days from a start day, `delta` may be negative. */
export function addDays(value: string, delta: number): string {
	const ymd = parseIso(value)!;
	const date = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + delta));
	return toIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Same day of another month; clamps to the last day (31 Jan + 1 month = 28 Feb). */
export function addMonths(value: string, delta: number): string {
	const ymd = parseIso(value)!;
	const index = ymd.y * 12 + (ymd.m - 1) + delta;
	const y = Math.floor(index / 12);
	const m = (index % 12) + 1;
	return toIso(y, m, Math.min(ymd.d, daysInMonth(y, m)));
}

export const monthStart = (value: string) => `${value.slice(0, 8)}01`;

/** Weekday index (0 = Sunday) of a day. */
const weekday = (value: string) => {
	const ymd = parseIso(value)!;
	return new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay();
};

/** The weeks of a month, each 7 `YYYY-MM-DD` strings (days of the neighbour months included) in the site's week order. */
export function monthWeeks(value: string, locale?: string): string[][] {
	const first = monthStart(value);
	const lead = (weekday(first) - weekStart(locale) + 7) % 7;
	const ymd = parseIso(first)!;
	const total = Math.ceil((lead + daysInMonth(ymd.y, ymd.m)) / 7) * 7;
	const days = Array.from({ length: total }, (_, i) => addDays(first, i - lead));
	return Array.from({ length: total / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
}

// English reads month first here, like the typed format (en-US), where the rest of the site uses en-GB
const intl = (locale: string | undefined, options: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat(norm(locale) === 'en' ? 'en-US' : intlLocale(locale), { timeZone: 'UTC', ...options });
const at = (value: string) => {
	const ymd = parseIso(value)!;
	return new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12));
};
const cap = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** "October 2026", "2026년 10월", "Октябрь 2026", "Oktabr 2026" */
export function monthLabel(value: string, locale?: string): string {
	const ymd = parseIso(value)!;
	const l = norm(locale);
	if (l === 'uz') return `${cap(UZ_MONTHS[ymd.m - 1])} ${ymd.y}`;
	if (l === 'ru') return `${cap(intl(l, { month: 'long' }).format(at(value)))} ${ymd.y}`;
	return intl(l, { month: 'long', year: 'numeric' }).format(at(value));
}

/** Column headers in the site's week order: short names plus the full name for screen readers. */
export function weekdayNames(locale?: string): { short: string; long: string }[] {
	const l = norm(locale);
	const start = weekStart(l);
	// 2026-10-04 is a Sunday
	return Array.from({ length: 7 }, (_, i) => {
		const index = (start + i) % 7;
		if (l === 'uz') return { short: UZ_WEEKDAYS_SHORT[index], long: cap(UZ_WEEKDAYS[index]) };
		const day = at(addDays('2026-10-04', index));
		return { short: cap(intl(l, { weekday: 'short' }).format(day)), long: cap(intl(l, { weekday: 'long' }).format(day)) };
	});
}

/** "Friday, 16 October 2026": the accessible name of a day button. */
export function dayLabel(value: string, locale?: string): string {
	const ymd = parseIso(value)!;
	const l = norm(locale);
	if (l === 'uz') return `${cap(UZ_WEEKDAYS[weekday(value)])}, ${ymd.d}-${UZ_MONTHS[ymd.m - 1]}, ${ymd.y}`;
	return intl(l, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(at(value));
}

/** Today on the visitor's own calendar. */
export function todayIso(now: Date = new Date()): string {
	return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
