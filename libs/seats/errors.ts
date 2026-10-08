import { ApiError, NETWORK_ERROR } from '../errors';

/**
 * The checkout and seat operations answer with plain messages and no codes. This is the ONE place that maps a
 * message to a translation key (namespace `checkout`), so it can switch to codes when the backend adds them.
 * Anything unknown becomes the generic message; the server text is never shown to the buyer.
 *
 * Messages come from libs/enums/common.enum.ts in the backend.
 */
const MESSAGES: Record<string, string> = {
	'Seat just taken!': 'errors.seatTaken',
	'Seat not found!': 'errors.seatNotFound',
	'You can hold at most 8 seats at a time!': 'errors.holdLimit',
	'Hold expired!': 'errors.holdExpired',
	'This order can no longer be paid!': 'errors.orderNotPayable',
	'Seats can only be held for an approved reserved-seating event that has not started!': 'errors.eventClosed',
	// createCheckout and holdSeats answer this for ended, not-yet-on-sale, sold-out and inactive accounts alike
	'Not Allowed Request!': 'errors.notAllowed',
	'No data found!': 'errors.notFound',
	'Something went wrong!': 'errors.generic',
};

export interface CheckoutErrorKey {
	key: string;
	/** Session ended: the caller sends the buyer to login */
	auth: boolean;
}

export function checkoutErrorKey(error: ApiError): CheckoutErrorKey {
	if (error.code === 'UNAUTHENTICATED') return { key: 'errors.session', auth: true };
	if (error.code === NETWORK_ERROR) return { key: 'errors.network', auth: false };
	return { key: MESSAGES[error.message] ?? 'errors.generic', auth: false };
}

export const isSeatConflict = (error: ApiError) => error.message === 'Seat just taken!';
export const isHoldExpired = (error: ApiError) => error.message === 'Hold expired!';
export const isOrderNotPayable = (error: ApiError) => error.message === 'This order can no longer be paid!';
