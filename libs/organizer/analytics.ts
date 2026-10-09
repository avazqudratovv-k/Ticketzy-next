export type Bucket = 'day' | 'week';

export interface SalesOrder {
	eventId: string;
	ticketCount: number;
	totalAmount: number;
	currency?: string | null;
	paidAt?: string | null;
	createdAt: string;
}

export interface Point {
	/** YYYY-MM-DD of the day (or of the Monday of the week) */
	key: string;
	tickets: number;
	revenue: number;
	orders: number;
}

/** The calendar day of an instant in a time zone, as YYYY-MM-DD. */
export function dayIn(iso: string | number | Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
	return `${get('year')}-${get('month')}-${get('day')}`;
}

const dayNumber = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / 86_400_000;
const fromNumber = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
/** Monday of the week of a day (days are treated as plain calendar dates). */
const mondayOf = (day: string) => {
	const n = dayNumber(day);
	return fromNumber(n - ((((new Date(n * 86_400_000).getUTCDay() + 6) % 7) + 7) % 7));
};

export const PERIODS = [14, 30, 90, 0] as const;
export type Period = (typeof PERIODS)[number];
export const isPeriod = (value: number): value is Period => (PERIODS as readonly number[]).includes(value);

export interface Series {
	points: Point[];
	bucket: Bucket;
	/** first and last day shown */
	from: string;
	to: string;
}

/**
 * Sales per day (or per week when the span is longer than 120 days) in the given zone from paid orders.
 * `period` is the number of days ending today; 0 means since the first paid order. Orders in another currency count
 * tickets but not revenue is the caller's choice: pass only one currency.
 */
export function buildSeries(orders: SalesOrder[], period: Period, timeZone: string, now = new Date()): Series {
	const today = dayIn(now, timeZone);
	const stamped = orders.map((o) => ({ o, day: dayIn(o.paidAt ?? o.createdAt, timeZone) }));
	const earliest = stamped.reduce((min, s) => (s.day < min ? s.day : min), today);
	const from = period === 0 ? earliest : fromNumber(dayNumber(today) - (period - 1));
	const span = dayNumber(today) - dayNumber(from) + 1;
	const bucket: Bucket = span > 120 ? 'week' : 'day';
	const keyOf = (day: string) => (bucket === 'week' ? mondayOf(day) : day);
	const points = new Map<string, Point>();
	for (let n = dayNumber(from); n <= dayNumber(today); n++) {
		const key = keyOf(fromNumber(n));
		if (!points.has(key)) points.set(key, { key, tickets: 0, revenue: 0, orders: 0 });
	}
	for (const { o, day } of stamped) {
		if (day < from || day > today) continue;
		const point = points.get(keyOf(day));
		if (!point) continue;
		point.tickets += o.ticketCount;
		point.revenue += o.totalAmount;
		point.orders += 1;
	}
	return { points: Array.from(points.values()), bucket, from, to: today };
}

export interface TypeMix {
	name: string;
	tickets: number;
	revenue: number;
}

/** Sales per ticket type name; types of different events with the same name are merged (the label says so). */
export function mixByName(rows: { ticketTypeName?: string | null; ticketsSold: number; revenue: number }[], unnamed: string): TypeMix[] {
	const byName = new Map<string, TypeMix>();
	for (const row of rows) {
		const name = row.ticketTypeName || unnamed;
		const entry = byName.get(name) ?? { name, tickets: 0, revenue: 0 };
		entry.tickets += row.ticketsSold;
		entry.revenue += row.revenue;
		byName.set(name, entry);
	}
	return Array.from(byName.values()).sort((a, b) => b.tickets - a.tickets || b.revenue - a.revenue);
}
