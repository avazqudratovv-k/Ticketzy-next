import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { GET_ATTENDEES } from '../../apollo/organizer/sales';
import { Attendee } from './attendees';

const CHUNK = 100; // the backend maximum (decision #91)
const MAX_PAGES = 100;

export interface AttendeeData {
	list: Attendee[];
	/** the server's own counts: sold = valid + used (the same numbers the check-in counter uses), used, refunded */
	counts: { sold: number; used: number; refunded: number };
	/** true when more than CHUNK x MAX_PAGES tickets exist and the list stops early */
	partial: boolean;
}

/**
 * Loads every ticket of one event: the default query (valid + used, which is what the check-in counter counts) and the
 * refunded ones, which the backend only returns when asked for. The server can neither search nor filter by buyer, so the
 * page filters, pages and exports this list on the client.
 */
export default function useAllAttendees(eventId: string, skip: boolean) {
	const client = useApolloClient();
	const [data, setData] = useState<AttendeeData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<unknown>(null);
	const run = useRef(0);

	const load = useCallback(async () => {
		const id = ++run.current;
		setLoading(true);
		setError(null);
		try {
			const fetchAll = async (ticketStatus?: string) => {
				const list: Attendee[] = [];
				let total = 0;
				for (let page = 1; page <= MAX_PAGES; page++) {
					const { data: res } = await client.query({
						query: GET_ATTENDEES,
						variables: { input: { eventId, page, limit: CHUNK, ...(ticketStatus ? { ticketStatus } : {}) } },
						fetchPolicy: 'network-only',
					});
					const chunk = res.getEventAttendees;
					total = chunk.metaCounter?.[0]?.total ?? 0;
					list.push(...(chunk.list as Attendee[]));
					if (list.length >= total || chunk.list.length === 0) break;
				}
				return { list, total };
			};
			const [active, refunded, used] = await Promise.all([
				fetchAll(),
				fetchAll('REFUNDED'),
				client.query({ query: GET_ATTENDEES, variables: { input: { eventId, page: 1, limit: 1, ticketStatus: 'USED' } }, fetchPolicy: 'network-only' }),
			]);
			if (id !== run.current) return;
			setData({
				list: [...active.list, ...refunded.list],
				counts: { sold: active.total, used: used.data.getEventAttendees.metaCounter?.[0]?.total ?? 0, refunded: refunded.total },
				partial: active.list.length < active.total || refunded.list.length < refunded.total,
			});
		} catch (err) {
			if (id === run.current) setError(err);
		} finally {
			if (id === run.current) setLoading(false);
		}
	}, [client, eventId]);

	useEffect(() => {
		setData(null);
		if (skip || !eventId) return undefined;
		void load();
		return () => {
			run.current++;
		};
	}, [skip, eventId, load]);

	return { data, loading, error, reload: load };
}
