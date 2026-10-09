import { EventItem } from './types/event';

/** Sales that open within this many days still make an event eligible for the hero. */
export const FEATURED_SALES_WINDOW_DAYS = 7;
/** How many upcoming events the home page fetches to rank (one request, no per-event calls). */
export const FEATURED_POOL = 20;

const DAY = 24 * 60 * 60 * 1000;
const ms = (iso?: string | null) => (iso ? new Date(iso).getTime() : NaN);

const soldRatio = (event: EventItem) =>
	typeof event.eventTotalSeats === 'number' && event.eventTotalSeats > 0 && typeof event.eventSoldSeats === 'number'
		? event.eventSoldSeats / event.eventTotalSeats
		: 0;

/** Approved, not ended, not sold out, has an image, and ticket sales are open or open within 7 days. */
export function isFeaturable(event: EventItem, now: number): boolean {
	if (event.eventStatus !== 'APPROVED' || !event.eventImages?.length) return false;
	const end = ms(event.endAt);
	if (Number.isFinite(end) && end <= now) return false;
	const { eventTotalSeats: total, eventSoldSeats: sold } = event;
	if (typeof total === 'number' && typeof sold === 'number' && sold >= total) return false;
	const saleStart = ms(event.saleStartAt);
	const saleEnd = ms(event.saleEndAt);
	if (Number.isFinite(saleEnd) && saleEnd <= now) return false;
	return !Number.isFinite(saleStart) || saleStart <= now + FEATURED_SALES_WINDOW_DAYS * DAY;
}

const byStart = (a: EventItem, b: EventItem) => ms(a.startAt) - ms(b.startAt) || soldRatio(b) - soldRatio(a);

/**
 * The big hero event and the three events beside it.
 *
 * Eligible events (see `isFeaturable`) are ranked by the soonest start; a tie goes to the higher sold ratio.
 * The hero is the first. The three others are the next three, each preferably from a category not yet used by the hero
 * or by a card already chosen. When fewer than four qualify, the rest come from the other upcoming events (same order),
 * so the block is never empty while there is any event at all.
 *
 * | situation                                                          | result                                    |
 * |--------------------------------------------------------------------|-------------------------------------------|
 * | A concert Oct 12, B football Oct 12 (80% sold), C concert Oct 15,  | ranked B, A, C, D, E: hero B (tie, more   |
 * | D comedy Oct 20, E football Oct 25, all eligible                   | sold); side A, D (new categories), then C |
 * |                                                                    | (none left); shown in start order A, C, D |
 * | the soonest event is sold out or has no image                      | skipped, the next one is the hero         |
 * | ticket sales of the soonest event start in 10 days                 | skipped (not open, not within 7 days)     |
 * | 2 events qualify, 5 are upcoming                                   | the 2, then the others by start date      |
 * | nothing qualifies                                                  | the upcoming list in start order          |
 */
export function pickFeatured(events: EventItem[], now: number): { hero?: EventItem; side: EventItem[]; featured: boolean } {
	const eligible = events.filter((event) => isFeaturable(event, now)).sort(byStart);
	const fallback = events.filter((event) => !eligible.includes(event) && !(ms(event.endAt) <= now)).sort(byStart);
	const hero = eligible[0] ?? fallback[0];
	if (!hero) return { side: [], featured: false };

	const others = (list: EventItem[]) => list.filter((event) => event !== hero);
	const side: EventItem[] = [];
	const used = new Set([hero.eventCategory]);
	// eligible events first (a new category, then plain order), then the remaining upcoming events the same way
	for (const pool of [others(eligible), others(fallback)]) {
		for (const event of pool) {
			if (side.length < 3 && !used.has(event.eventCategory)) {
				side.push(event);
				used.add(event.eventCategory);
			}
		}
		for (const event of pool) {
			if (side.length < 3 && !side.includes(event)) side.push(event);
		}
	}
	side.sort(byStart);
	return { hero, side, featured: eligible.length > 0 && hero === eligible[0] };
}

/** Start of the "upcoming" window for the home queries: now, rounded down to the hour so the cache key is stable. */
export const upcomingFrom = (now: number): string => new Date(Math.floor(now / 3_600_000) * 3_600_000).toISOString();

/** `getEvents` search for events that have not started yet (the backend lists approved events only). */
export const upcomingSearch = (from: string, extra: Record<string, unknown> = {}) => ({
	...extra,
	periodsRange: { start: from, end: '2100-01-01T00:00:00.000Z' },
});
