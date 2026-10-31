import { formatEventDate, formatZoneName } from './format';

/** "Fri, 12 Dec 2026 · 23:59 (GMT+9)": a refund deadline on the venue's clock, with the zone, as buyers read it. */
export function formatRefundDeadline(deadline: Date | string, locale: string | undefined, timeZone: string | null | undefined): string {
	const iso = typeof deadline === 'string' ? deadline : deadline.toISOString();
	return `${formatEventDate(iso, locale, timeZone, true)} (${formatZoneName(iso, locale, timeZone)})`;
}
