import { EventCategory, EventItem, EventLocaleCode, TicketTypeItem } from './types/event';

/** Categories the public site offers as filters and sections (design: Concerts, Football, Comedy, Other). */
export const PUBLIC_CATEGORIES = ['CONCERT', 'FOOTBALL', 'COMEDY'] as const;
/** Categories grouped under the design's "Other" tile and filter. */
export const OTHER_CATEGORIES: EventCategory[] = ['SPORT', 'THEATER', 'CONFERENCE', 'FESTIVAL', 'OTHER'];

export const CATEGORY_VALUES: EventCategory[] = [...PUBLIC_CATEGORIES, ...OTHER_CATEGORIES];

export const isCategory = (value: unknown): value is EventCategory =>
	typeof value === 'string' && (CATEGORY_VALUES as string[]).includes(value);

/** The sort options of the events list. Keys go in the URL; field and direction go to `getEvents`. */
export const EVENT_SORTS = {
	date: { sort: 'startAt', direction: 'ASC' },
	priceAsc: { sort: 'eventMinPrice', direction: 'ASC' },
	priceDesc: { sort: 'eventMinPrice', direction: 'DESC' },
	popular: { sort: 'eventViews', direction: 'DESC' },
	newest: { sort: 'createdAt', direction: 'DESC' },
} as const;
export type EventSortKey = keyof typeof EVENT_SORTS;
export const isSortKey = (value: unknown): value is EventSortKey => typeof value === 'string' && value in EVENT_SORTS;

export const DEFAULT_LOCALE_CODE: EventLocaleCode = 'EN';

export const toEventLocale = (locale: string | undefined): EventLocaleCode => {
	const code = (locale ?? 'en').toUpperCase();
	return code === 'KO' || code === 'RU' || code === 'UZ' ? code : 'EN';
};

/** Title and description in the active language; a missing translation falls back to the default language (EN), then to the base fields. */
export function localizedEvent(
	event: Pick<EventItem, 'eventTitle' | 'eventDesc' | 'eventTranslations'>,
	locale?: string,
) {
	const wanted = toEventLocale(locale);
	const list = event.eventTranslations ?? [];
	const pick = (code: EventLocaleCode) => list.find((entry) => entry.locale === code && entry.title?.trim());
	const own = pick(wanted);
	const fallback = pick(DEFAULT_LOCALE_CODE);
	const title = own?.title ?? fallback?.title ?? event.eventTitle;
	// Description falls back separately: a translation may have a title but no text
	const description =
		(own?.description?.trim() ? own.description : undefined) ??
		(fallback?.description?.trim() ? fallback.description : undefined) ??
		event.eventDesc ??
		null;
	return { title, description, translated: Boolean(own), lang: own ? wanted.toLowerCase() : 'en' };
}

const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();

export type SaleState = 'cancelled' | 'ended' | 'soldOut' | 'notStarted' | 'saleClosed' | 'onSale';

/** What the visitor can do with an event, from its status, dates and ticket types. */
export function saleState(event: Pick<EventItem, 'eventStatus' | 'endAt'>, ticketTypes: TicketTypeItem[]): SaleState {
	if (event.eventStatus === 'CANCELLED') return 'cancelled';
	if (event.eventStatus === 'ENDED' || !isFuture(event.endAt)) return 'ended';
	if (ticketTypes.length === 0) return 'onSale';
	const soldOut = (tt: TicketTypeItem) => tt.ticketTypeStatus === 'SOLD_OUT' || tt.soldQuantity >= tt.totalQuantity;
	if (ticketTypes.every(soldOut)) return 'soldOut';
	const open = ticketTypes.filter((tt) => !soldOut(tt) && tt.ticketTypeStatus === 'ACTIVE');
	const now = Date.now();
	const live = open.filter(
		(tt) =>
			(!tt.saleStartAt || new Date(tt.saleStartAt).getTime() <= now) &&
			(!tt.saleEndAt || new Date(tt.saleEndAt).getTime() > now),
	);
	if (live.length > 0) return 'onSale';
	return open.some((tt) => tt.saleStartAt && new Date(tt.saleStartAt).getTime() > now) ? 'notStarted' : 'saleClosed';
}

/** URL slugs of the category filter and the categories each one stands for ("other" groups the rest). */
export type CategorySlug = 'concert' | 'football' | 'comedy' | 'other';
export const CATEGORY_SLUGS: { slug: CategorySlug; category: EventCategory; list: EventCategory[] }[] = [
	{ slug: 'concert', category: 'CONCERT', list: ['CONCERT'] },
	{ slug: 'football', category: 'FOOTBALL', list: ['FOOTBALL'] },
	{ slug: 'comedy', category: 'COMEDY', list: ['COMEDY'] },
	{ slug: 'other', category: 'OTHER', list: OTHER_CATEGORIES },
];
export const isCategorySlug = (value: unknown): value is CategorySlug => CATEGORY_SLUGS.some((c) => c.slug === value);
export const categoryHref = (slug: CategorySlug) => `/events?category=${slug}`;

export type TicketAvailability = 'available' | 'soldOut' | 'paused' | 'notStarted' | 'closed';

/** Whether one ticket type can be bought right now (status, stock and sale window). */
export const ticketAvailability = (tt: TicketTypeItem): TicketAvailability => {
	const now = Date.now();
	if (tt.ticketTypeStatus === 'SOLD_OUT' || tt.soldQuantity >= tt.totalQuantity) return 'soldOut';
	if (tt.ticketTypeStatus === 'PAUSED') return 'paused';
	if (tt.saleStartAt && new Date(tt.saleStartAt).getTime() > now) return 'notStarted';
	if (tt.saleEndAt && new Date(tt.saleEndAt).getTime() <= now) return 'closed';
	return 'available';
};
