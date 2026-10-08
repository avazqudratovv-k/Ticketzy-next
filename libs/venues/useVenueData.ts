import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApolloClient, useApolloClient } from '@apollo/client';
import { GET_EVENTS_FOR_VENUES, GET_VENUES_PAGE } from '../../apollo/organizer/venue';
import { VenueRecord } from './types';

export interface VenueEvent {
	_id: string;
	eventTitle: string;
	eventStatus: string;
	seatingType: 'GENERAL' | 'RESERVED';
	venueId: string;
	startAt: string;
}

const PAGE = 100;

/** Reads every page of a list query (the server has no filter for "my venues" and no count of events per venue). */
async function readAll<T>(read: (page: number) => Promise<{ list: T[]; total: number }>): Promise<T[]> {
	const all: T[] = [];
	for (let page = 1; page <= 50; page += 1) {
		const { list, total } = await read(page);
		all.push(...list);
		if (all.length >= total || list.length < PAGE) break;
	}
	return all;
}

/**
 * Events with seats on the venue pin its layout (backend DECISIONS #51: any non-DRAFT event with generated EventSeats).
 * Seats are generated when an event is approved, so a RESERVED event that is APPROVED, ENDED or CANCELLED (cancelling only
 * works from APPROVED) has them. The server decides; this is what the organizer's own events show.
 */
export const hasSeats = (event: VenueEvent) => event.seatingType === 'RESERVED' && ['APPROVED', 'ENDED', 'CANCELLED'].includes(event.eventStatus);

export function usageOf(events: VenueEvent[]) {
	return { events, count: events.length, seated: events.filter(hasSeats), open: events.filter((e) => !hasSeats(e) && e.eventStatus !== 'CANCELLED' && e.eventStatus !== 'ENDED') };
}

export async function fetchAllVenues(client: ApolloClient<object>): Promise<VenueRecord[]> {
	return readAll<VenueRecord>(async (page) => {
		const { data } = await client.query({
			query: GET_VENUES_PAGE,
			variables: { input: { page, limit: PAGE, sort: 'createdAt', direction: 'DESC', search: {} } },
			fetchPolicy: 'network-only',
		});
		return { list: data.getVenues.list, total: data.getVenues.metaCounter?.[0]?.total ?? data.getVenues.list.length };
	});
}

/** Every event of the organizer. An organizer with no events gets "no data" from the server: that is an empty list here. */
export async function fetchMyEvents(client: ApolloClient<object>): Promise<VenueEvent[]> {
	return readAll<VenueEvent>(async (page) => {
		try {
			const { data } = await client.query({
				query: GET_EVENTS_FOR_VENUES,
				variables: { input: { page, limit: PAGE, search: {} } },
				fetchPolicy: 'network-only',
			});
			return { list: data.getMyEvents.list, total: data.getMyEvents.metaCounter?.[0]?.total ?? data.getMyEvents.list.length };
		} catch {
			return { list: [], total: 0 };
		}
	});
}

/** The organizer's venues (filtered by `memberId`) and their own events, grouped by venue. */
export default function useMyVenues(memberId?: string) {
	const client = useApolloClient();
	const [venues, setVenues] = useState<VenueRecord[] | null>(null);
	const [events, setEvents] = useState<VenueEvent[] | null>(null);
	const [error, setError] = useState<unknown>(null);
	const [loading, setLoading] = useState(true);
	const run = useRef(0);

	const load = useCallback(async () => {
		if (!memberId) return;
		const id = (run.current += 1);
		setLoading(true);
		setError(null);
		try {
			const [venueList, eventList] = await Promise.all([fetchAllVenues(client), fetchMyEvents(client)]);
			if (id !== run.current) return;
			setVenues(venueList.filter((venue) => venue.memberId === memberId));
			setEvents(eventList);
		} catch (err) {
			if (id === run.current) setError(err);
		} finally {
			if (id === run.current) setLoading(false);
		}
	}, [client, memberId]);

	useEffect(() => {
		void load();
	}, [load]);

	const byVenue = useMemo(() => {
		const map = new Map<string, VenueEvent[]>();
		(events ?? []).forEach((event) => map.set(event.venueId, [...(map.get(event.venueId) ?? []), event]));
		return map;
	}, [events]);

	return { venues, events, byVenue, loading, error, reload: load };
}
