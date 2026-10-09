import { SalesEvent } from './useSalesEvents';

export interface TypeSales {
	ticketTypeId: string;
	ticketTypeName?: string | null;
	currency?: string | null;
	ticketsSold: number;
	revenue: number;
	commission: number;
	netPayout: number;
}

export interface EventMoney {
	event: SalesEvent;
	tickets: number;
	gross: number;
	commission: number;
	net: number;
	refunded: number;
	refundedOrders: number;
	/** where the event is in its life; payouts are not recorded by the backend, so this is the event's state, not a transfer */
	state: 'selling' | 'ended' | 'cancelled';
}

export const eventState = (event: SalesEvent, now = Date.now()): EventMoney['state'] =>
	event.eventStatus === 'CANCELLED' ? 'cancelled' : event.eventStatus === 'ENDED' || new Date(event.endAt).getTime() <= now ? 'ended' : 'selling';

/** Money of each event in one currency, from `getEventSales` rows (paid orders) and the refunded orders of the organizer. */
export function moneyByEvent(
	events: SalesEvent[],
	sales: Map<string, TypeSales[]>,
	refunds: { eventId: string; totalAmount: number; currency?: string | null }[],
	currency: string,
): EventMoney[] {
	return events.map((event) => {
		const rows = (sales.get(event._id) ?? []).filter((row) => (row.currency ?? 'KRW') === currency);
		const refunded = refunds.filter((r) => r.eventId === event._id && (r.currency ?? 'KRW') === currency);
		return {
			event,
			tickets: rows.reduce((n, r) => n + r.ticketsSold, 0),
			gross: rows.reduce((n, r) => n + r.revenue, 0),
			commission: rows.reduce((n, r) => n + r.commission, 0),
			net: rows.reduce((n, r) => n + r.netPayout, 0),
			refunded: refunded.reduce((n, r) => n + r.totalAmount, 0),
			refundedOrders: refunded.length,
			state: eventState(event),
		};
	});
}
