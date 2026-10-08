import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { GET_EVENT_SEAT_MAP } from '../../apollo/user/query';
import { ApiError, parseApiError } from '../errors';
import { SeatMapData } from '../seats/types';

const INTERVAL_MS = 3000;
const MAX_BACKOFF_MS = 30000;

/**
 * Polls `getEventSeatMap` (buyers get no WebSocket). Every 3 s while the tab is visible; paused when hidden and
 * refreshed at once when the tab is shown again; a failing poll backs off (3, 6, 12, 24, 30 s). A response that
 * arrives after a newer one was applied is dropped, so an old answer never rolls the map back.
 */
export function useSeatMap(eventId: string, enabled: boolean) {
	const client = useApolloClient();
	const [data, setData] = useState<SeatMapData | null>(null);
	const [error, setError] = useState<ApiError | null>(null);
	/** True while polls succeed; false after a failed poll. */
	const [live, setLive] = useState(false);
	const [loaded, setLoaded] = useState(false);

	const sent = useRef(0);
	const applied = useRef(0);
	const failures = useRef(0);
	const signature = useRef('');
	const timer = useRef<number>();

	const fetchOnce = useCallback(async (): Promise<SeatMapData | null> => {
		const id = ++sent.current;
		try {
			const result = await client.query({
				query: GET_EVENT_SEAT_MAP,
				variables: { eventId },
				fetchPolicy: 'no-cache',
			});
			if (id < applied.current) return null;
			applied.current = id;
			failures.current = 0;
			const next = result.data.getEventSeatMap as SeatMapData;
			// Keep the same object when nothing changed so memoised seats do not re-render on every poll
			const sig = JSON.stringify([next.seats, next.venueLayout]);
			if (sig !== signature.current) {
				signature.current = sig;
				setData(next);
			}
			setError(null);
			setLive(true);
			setLoaded(true);
			return next;
		} catch (err) {
			if (id < applied.current) return null;
			failures.current += 1;
			setError(parseApiError(err));
			setLive(false);
			setLoaded(true);
			return null;
		}
	}, [client, eventId]);

	useEffect(() => {
		if (!enabled || !eventId) return undefined;
		let stopped = false;

		const schedule = () => {
			window.clearTimeout(timer.current);
			if (stopped) return;
			const delay = Math.min(INTERVAL_MS * 2 ** failures.current, MAX_BACKOFF_MS);
			timer.current = window.setTimeout(tick, delay);
		};
		const tick = async () => {
			if (stopped) return;
			if (document.visibilityState === 'visible') await fetchOnce();
			schedule();
		};
		// `force` is the first load: a page opened in a background tab still gets its map once
		const refreshNow = async (force?: unknown) => {
			if (force !== true && document.visibilityState !== 'visible') return;
			window.clearTimeout(timer.current);
			failures.current = 0;
			await fetchOnce();
			schedule();
		};

		refreshNow(true);
		document.addEventListener('visibilitychange', refreshNow);
		window.addEventListener('focus', refreshNow);
		return () => {
			stopped = true;
			window.clearTimeout(timer.current);
			document.removeEventListener('visibilitychange', refreshNow);
			window.removeEventListener('focus', refreshNow);
		};
	}, [enabled, eventId, fetchOnce]);

	return { data, error, live, loaded, refresh: fetchOnce };
}
