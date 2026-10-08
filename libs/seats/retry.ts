import { SeatRef } from './types';

/**
 * What it takes to try again after a declined payment. The backend releases the seats and fails the order on a
 * declined payment, so a retry is a new hold and a new order for the same seats (or the same quantities). The
 * choice is remembered per order in the tab's session so it survives a reload of the checkout page.
 */
export interface RetryInfo {
	eventId: string;
	seats?: SeatRef[];
	items?: { ticketTypeId: string; quantity: number }[];
}

const key = (orderId: string) => `tz:retry:${orderId}`;

export function saveRetryInfo(orderId: string, info: RetryInfo) {
	try {
		sessionStorage.setItem(key(orderId), JSON.stringify(info));
	} catch {
		// without it the retry button sends the buyer back to the seat picker
	}
}

export function loadRetryInfo(orderId: string): RetryInfo | null {
	try {
		const raw = sessionStorage.getItem(key(orderId));
		return raw ? (JSON.parse(raw) as RetryInfo) : null;
	} catch {
		return null;
	}
}
