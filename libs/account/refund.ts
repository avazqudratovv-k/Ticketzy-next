import { ApiError } from '../errors';

/**
 * Server messages of the refund flow (Message enum in the backend, libs/enums/common.enum.ts) mapped to
 * translation keys in account.json. The backend decides eligibility; the UI only mirrors what it says.
 * An unknown message is shown as the server sent it.
 */
const REFUND_MESSAGES: Record<string, string> = {
	'The refund deadline of this order has passed!': 'refund.reason.deadline',
	'An order with a checked-in ticket cannot be refunded!': 'refund.reason.checkedIn',
	'Only a paid order can be refunded!': 'refund.reason.notPaid',
	'This order is being refunded right now!': 'refund.reason.inProgress',
	'The refund failed, nothing was changed. Please try again!': 'refund.reason.failed',
};

export const refundMessageKey = (message?: string | null): string | undefined => (message ? REFUND_MESSAGES[message] : undefined);

/** A failed request after which the quote is stale and should be read again. */
export const isEligibilityError = (error: ApiError): boolean =>
	error.message === 'The refund deadline of this order has passed!' ||
	error.message === 'An order with a checked-in ticket cannot be refunded!' ||
	error.message === 'Only a paid order can be refunded!';
