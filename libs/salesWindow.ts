import { useEffect, useState } from 'react';
import { serverNow } from './seats/clock';
import { EventItem, TicketTypeItem } from './types/event';

type WindowEvent = Pick<EventItem, 'saleStartAt' | 'saleEndAt'>;

const ms = (iso?: string | null) => (iso ? new Date(iso).getTime() : NaN);

/**
 * A ticket type is bought only inside BOTH the event's sales window and its own (backend DECISIONS #71: the event window
 * is checked first, the ticket type's at purchase). So a type opens at the later of the two starts and closes at the
 * earlier of the two ends.
 */
export const typeWindow = (event: WindowEvent, tt?: Pick<TicketTypeItem, 'saleStartAt' | 'saleEndAt'> | null) => {
	const starts = [ms(event.saleStartAt), ms(tt?.saleStartAt)].filter(Number.isFinite);
	const ends = [ms(event.saleEndAt), ms(tt?.saleEndAt)].filter(Number.isFinite);
	return {
		start: starts.length ? Math.max(...starts) : null,
		end: ends.length ? Math.min(...ends) : null,
	};
};

export const isOpenType = (tt: TicketTypeItem) =>
	tt.ticketTypeStatus === 'ACTIVE' && tt.soldQuantity < tt.totalQuantity;

export interface SalesInfo {
	phase: 'open' | 'notStarted' | 'ended';
	/** notStarted: the earliest upcoming start. ended: the last end. */
	at: string | null;
	/** notStarted: upcoming types whose own start differs from `at` */
	later: { id: string; name: string; at: string }[];
}

const iso = (time: number) => new Date(time).toISOString();

/**
 * Where the sales window stands at `now`. Without ticket types (a card, or types still loading) only the event's own
 * window is known. Types that are paused or sold out say nothing about the window.
 */
export function salesInfo(event: WindowEvent, ticketTypes: TicketTypeItem[] | undefined, now: number): SalesInfo {
	const open = (ticketTypes ?? []).filter(isOpenType);
	const windows = open.length
		? open.map((tt) => ({ tt, ...typeWindow(event, tt) }))
		: ticketTypes?.length
		? []
		: [{ tt: null, ...typeWindow(event) }];
	if (windows.length === 0) return { phase: 'open', at: null, later: [] };
	const live = windows.some((w) => (w.start === null || w.start <= now) && (w.end === null || w.end > now));
	if (live) return { phase: 'open', at: null, later: [] };
	const upcoming = windows.filter((w) => w.start !== null && w.start > now);
	if (upcoming.length) {
		const first = Math.min(...upcoming.map((w) => w.start as number));
		const later = upcoming
			.filter((w) => w.tt && w.start !== first)
			.map((w) => ({ id: (w.tt as TicketTypeItem)._id, name: (w.tt as TicketTypeItem).ticketTypeName, at: iso(w.start as number) }));
		return { phase: 'notStarted', at: iso(first), later };
	}
	const ends = windows.map((w) => w.end).filter((end): end is number => end !== null);
	return { phase: 'ended', at: ends.length ? iso(Math.max(...ends)) : null, later: [] };
}

/** Every instant at which the sales state can change. */
const boundaries = (event: WindowEvent | undefined, ticketTypes: TicketTypeItem[] | undefined) =>
	[event?.saleStartAt, event?.saleEndAt, ...(ticketTypes ?? []).flatMap((tt) => [tt.saleStartAt, tt.saleEndAt])]
		.map(ms)
		.filter(Number.isFinite);

const MAX_TIMER = 2 ** 31 - 1;

/**
 * The server's "now", updated when the next sales boundary passes: ONE timeout per page (re-armed at each boundary, and
 * when the tab becomes visible again because hidden tabs delay timers). No polling. The offset is the one the hold
 * countdown uses (`serverNow`), so a device clock that is off by minutes still unlocks at the server's time.
 */
export function useSalesClock(event: WindowEvent | undefined, ticketTypes: TicketTypeItem[] | undefined): number {
	const [now, setNow] = useState(() => serverNow());
	const key = boundaries(event, ticketTypes).sort().join(',');
	useEffect(() => {
		let timer: number | undefined;
		const times = key ? key.split(',').map(Number) : [];
		const arm = () => {
			window.clearTimeout(timer);
			const current = serverNow();
			setNow(current);
			const next = times.filter((time) => time > current).sort((a, b) => a - b)[0];
			if (next !== undefined) timer = window.setTimeout(arm, Math.min(next - current + 100, MAX_TIMER));
		};
		arm();
		const onVisible = () => document.visibilityState === 'visible' && arm();
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			window.clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	}, [key]);
	return now;
}
