export type OrderStatusKey = 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
export const ORDER_STATUSES: OrderStatusKey[] = ['PAID', 'REFUNDED', 'PENDING_PAYMENT', 'FAILED', 'CANCELLED', 'EXPIRED'];
export const isOrderStatus = (value: unknown): value is OrderStatusKey => (ORDER_STATUSES as unknown[]).includes(value);

export interface OrgOrder {
	_id: string;
	orderNumber: string;
	orderStatus: OrderStatusKey;
	buyerNick?: string | null;
	eventId: string;
	ticketCount: number;
	items: { ticketTypeId: string; quantity: number; unitPrice: number }[];
	seats: { sectionKey: string; row: number; number: number }[];
	currency?: string | null;
	subtotal: number;
	commissionRate: number;
	commissionAmount: number;
	totalAmount: number;
	paidAt?: string | null;
	refundedAt?: string | null;
	createdAt: string;
	eventData?: { _id: string; eventTitle: string; eventTranslations?: { locale: string; title: string; description?: string }[] } | null;
}

/** Sorts the backend accepts on orders (`availableOrderSorts`: createdAt, updatedAt, totalAmount). */
export const ORDER_SORTS = {
	newest: { sort: 'createdAt', direction: 'DESC' },
	oldest: { sort: 'createdAt', direction: 'ASC' },
	amountDesc: { sort: 'totalAmount', direction: 'DESC' },
	amountAsc: { sort: 'totalAmount', direction: 'ASC' },
} as const;
export type OrderSortKey = keyof typeof ORDER_SORTS;
export const isOrderSortKey = (value: unknown): value is OrderSortKey => typeof value === 'string' && value in ORDER_SORTS;

export const ORDERS_PAGE_SIZE = 10;

/** What the organizer receives: the buyer pays `totalAmount` (= subtotal) and the commission is taken from it (backend DECISIONS #47). */
export const payoutOf = (order: Pick<OrgOrder, 'subtotal' | 'commissionAmount'>) => order.subtotal - order.commissionAmount;

/** Seats grouped by section as "Block A: row 3, seats 7, 8". Section names come from the venue layout when it is known. */
export function groupSeats(
	seats: OrgOrder['seats'],
	sectionName: (key: string) => string,
): { section: string; places: { row: number; numbers: number[] }[] }[] {
	const bySection = new Map<string, Map<number, number[]>>();
	for (const seat of seats) {
		const rows = bySection.get(seat.sectionKey) ?? new Map<number, number[]>();
		rows.set(seat.row, [...(rows.get(seat.row) ?? []), seat.number]);
		bySection.set(seat.sectionKey, rows);
	}
	return Array.from(bySection, ([key, rows]) => ({
		section: sectionName(key),
		places: Array.from(rows, ([row, numbers]) => ({ row, numbers: numbers.sort((a, b) => a - b) })).sort((a, b) => a.row - b.row),
	}));
}
