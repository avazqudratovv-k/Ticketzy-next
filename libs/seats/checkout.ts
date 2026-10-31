import { ApolloClient } from '@apollo/client';
import { CREATE_CHECKOUT, HOLD_SEATS } from '../../apollo/user/mutation';
import { saveRetryInfo } from './retry';
import { updateClockSkew } from './clock';
import { SeatHold, SeatRef } from './types';

/**
 * Hold the seats, then turn the hold into a pending order. Returns the order id.
 * The hold is sent as coordinates (`seats`); the old `seatIds` form is not used.
 */
export async function holdAndCheckout(client: ApolloClient<object>, eventId: string, seats: SeatRef[], acknowledgeNonRefundable?: boolean): Promise<string> {
	const sentAt = Date.now();
	const { data } = await client.mutate({
		mutation: HOLD_SEATS,
		variables: { eventId, seats: seats.map(({ sectionKey, row, number }) => ({ sectionKey, row, number })) },
	});
	const hold = data.holdSeats as SeatHold;
	updateClockSkew(hold.serverTime, sentAt, Date.now());
	const order = await client.mutate({
		mutation: CREATE_CHECKOUT,
		variables: { input: { eventId, seatIds: hold.seats.map((seat) => seat._id), ...(acknowledgeNonRefundable ? { acknowledgeNonRefundable: true } : {}) } },
	});
	const orderId = order.data.createCheckout._id as string;
	saveRetryInfo(orderId, { eventId, seats });
	return orderId;
}

/** GENERAL admission: the order itself reserves the stock; it expires after the same hold time. */
export async function checkoutQuantities(
	client: ApolloClient<object>,
	eventId: string,
	items: { ticketTypeId: string; quantity: number }[],
	acknowledgeNonRefundable?: boolean,
): Promise<string> {
	const order = await client.mutate({ mutation: CREATE_CHECKOUT, variables: { input: { eventId, items, ...(acknowledgeNonRefundable ? { acknowledgeNonRefundable: true } : {}) } } });
	const orderId = order.data.createCheckout._id as string;
	saveRetryInfo(orderId, { eventId, items });
	return orderId;
}
