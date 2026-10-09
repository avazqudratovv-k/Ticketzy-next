/** Seat-availability badge of an event card. Thresholds live here only. */
export const SEAT_BADGE = {
	/** "Few seats left": remaining seats are this share of the total, or less (and above 0) */
	fewLeftShare: 0.1,
	/** "Selling fast": this share of the seats, or more, is sold */
	soldShare: 0.5,
} as const;

export type SeatBadge = 'soldOut' | 'fewLeft' | 'sellingFast';

/**
 * One badge per event, from the counts the event list queries return (no extra request). No badge when either count
 * is missing or the total is 0: the backend does not count standing sections in reserved venues.
 */
export function seatBadge(total?: number | null, sold?: number | null): SeatBadge | null {
	if (typeof total !== 'number' || typeof sold !== 'number' || !(total > 0) || sold < 0) return null;
	if (sold >= total) return 'soldOut';
	if ((total - sold) / total <= SEAT_BADGE.fewLeftShare) return 'fewLeft';
	if (sold / total >= SEAT_BADGE.soldShare) return 'sellingFast';
	return null;
}
