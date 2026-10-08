/** Wall-clock <-> UTC in a named IANA time zone, with Intl only (DST safe). The organizer types the venue's local time. */
import { DEFAULT_TIMEZONE } from '../format';

const validZone = (zone?: string | null) => {
	if (!zone) return DEFAULT_TIMEZONE;
	try {
		new Intl.DateTimeFormat('en', { timeZone: zone });
		return zone;
	} catch {
		return DEFAULT_TIMEZONE;
	}
};

const partsOf = (ms: number, zone: string) => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: zone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(new Date(ms));
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
};

/** Offset of the zone from UTC at an instant, in ms (positive east of Greenwich). */
const offsetAt = (ms: number, zone: string) => {
	const p = partsOf(ms, zone);
	return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
};

/** "2026-11-14" + "20:00" on the venue's wall clock -> ISO instant. Returns null when the pair is not a real date. */
export function zonedToIso(date: string, time: string, zoneName?: string | null): string | null {
	const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	const t = /^(\d{2}):(\d{2})$/.exec(time);
	if (!d || !t) return null;
	const [y, mo, da, h, mi] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
	const check = new Date(Date.UTC(y, mo - 1, da, h, mi));
	if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== da || h > 23 || mi > 59) return null;
	const zone = validZone(zoneName);
	const wall = Date.UTC(y, mo - 1, da, h, mi);
	let utc = wall - offsetAt(wall, zone);
	// A second pass settles the hours around a DST change
	utc = wall - offsetAt(utc, zone);
	return new Date(utc).toISOString();
}

/** ISO instant -> the venue's local date and time for the two inputs. */
export function isoToZoned(iso: string | null | undefined, zoneName?: string | null): { date: string; time: string } {
	if (!iso) return { date: '', time: '' };
	const ms = new Date(iso).getTime();
	if (Number.isNaN(ms)) return { date: '', time: '' };
	const p = partsOf(ms, validZone(zoneName));
	const two = (n: number) => String(n).padStart(2, '0');
	return { date: `${p.year}-${two(p.month)}-${two(p.day)}`, time: `${two(p.hour)}:${two(p.minute)}` };
}
