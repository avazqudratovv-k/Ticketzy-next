import { EventStatus } from '../types/event';

/** Tabs of the approvals list: Pending is the queue and the default. The URL stores the lowercase status or `all`. */
export const EVENT_TABS = ['pending', 'approved', 'rejected', 'cancelled', 'ended', 'draft', 'all'] as const;
export type EventTab = (typeof EVENT_TABS)[number];
export const isEventTab = (value: string): value is EventTab => (EVENT_TABS as readonly string[]).includes(value);
export const tabStatus = (tab: EventTab): EventStatus | null => (tab === 'all' ? null : (tab.toUpperCase() as EventStatus));

/** Sorts `getEventsByAdmin` accepts (availableEventSorts). */
export const EVENT_SORTS = {
	updatedDesc: { sort: 'updatedAt', direction: 'DESC' },
	updatedAsc: { sort: 'updatedAt', direction: 'ASC' },
	startAsc: { sort: 'startAt', direction: 'ASC' },
	startDesc: { sort: 'startAt', direction: 'DESC' },
	createdDesc: { sort: 'createdAt', direction: 'DESC' },
} as const;
export type EventSortKey = keyof typeof EVENT_SORTS;
export const isEventSortKey = (value: string): value is EventSortKey => value in EVENT_SORTS;

export const EVENTS_PAGE_SIZE = 10;
