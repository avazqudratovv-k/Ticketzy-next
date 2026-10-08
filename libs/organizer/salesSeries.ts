export interface PaidOrder {
	paidAt?: string | null;
	createdAt: string;
	totalAmount: number;
	currency?: string | null;
}

export interface DayPoint {
	/** local calendar day, YYYY-MM-DD */
	day: string;
	revenue: number;
	orders: number;
}

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Revenue per day for the last `days` days (today included), from the organizer's paid orders. The backend has no time series,
 * so this is built from the order list; days are the viewer's own calendar days. Orders of another currency are left out.
 */
export function dailyRevenue(orders: PaidOrder[], currency: string, days = 30, now = new Date()): DayPoint[] {
	const points = new Map<string, DayPoint>();
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
		points.set(dayKey(d), { day: dayKey(d), revenue: 0, orders: 0 });
	}
	for (const order of orders) {
		if ((order.currency ?? 'KRW') !== currency) continue;
		const point = points.get(dayKey(new Date(order.paidAt ?? order.createdAt)));
		if (!point) continue;
		point.revenue += order.totalAmount;
		point.orders += 1;
	}
	return Array.from(points.values());
}
