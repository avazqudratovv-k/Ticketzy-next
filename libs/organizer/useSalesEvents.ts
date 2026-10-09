import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_SALES_EVENTS } from '../../apollo/organizer/sales';
import { localizedEvent } from '../events';

export interface SalesEvent {
	_id: string;
	eventStatus: string;
	eventTitle: string;
	eventTranslations: { locale: string; title: string }[];
	seatingType: 'GENERAL' | 'RESERVED';
	startAt: string;
	endAt: string;
	saleStartAt?: string | null;
	eventViews: number;
	eventLikes: number;
	venueId: string;
	venueData?: { _id: string; venueName: string; venueTimezone: string } | null;
}

/** Only these statuses can have orders (backend DECISIONS #37, #69): an event is on sale once approved, and a cancelled or ended one keeps its orders. */
const WITH_SALES = ['APPROVED', 'ENDED', 'CANCELLED'];

/** The organizer's events that can have sales, newest event first (the last 100; `getMyEvents` pages by 100 at most in this app). */
export default function useSalesEvents(skip: boolean, locale?: string) {
	const { data, loading, error, refetch } = useQuery(GET_SALES_EVENTS, {
		variables: { input: { page: 1, limit: 100, sort: 'startAt', direction: 'DESC', search: {} } },
		skip,
		fetchPolicy: 'cache-and-network',
	});
	const events = useMemo(() => ((data?.getMyEvents?.list ?? []) as SalesEvent[]).filter((e) => WITH_SALES.includes(e.eventStatus)), [data]);
	const total: number = data?.getMyEvents?.metaCounter?.[0]?.total ?? 0;
	const title = (event: SalesEvent) => localizedEvent(event as never, locale).title;
	return { events, loading: loading && !data, error: error && !data ? error : undefined, refetch, title, truncated: total > 100 };
}
