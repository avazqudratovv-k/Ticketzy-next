import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_UNREAD_NOTIFICATION_COUNT } from '../../apollo/user/query';
import useAuth from './useAuth';

export const UNREAD_POLL_MS = 30_000;

/**
 * Number of unread notifications of the signed-in member. Polls about every 30 seconds while the tab is visible,
 * stops when it is hidden and checks once when the tab comes back. Only the header bell polls (`poll`);
 * other readers share its cached value.
 */
export default function useUnreadCount(poll = true): number {
	const { user } = useAuth();
	const { data, startPolling, stopPolling, refetch } = useQuery<{ getUnreadNotificationCount: number }>(
		GET_UNREAD_NOTIFICATION_COUNT,
		{ skip: !user, fetchPolicy: 'cache-and-network', errorPolicy: 'ignore' },
	);

	useEffect(() => {
		if (!user || !poll) return;
		const sync = () => {
			if (document.visibilityState === 'visible') {
				refetch().catch(() => undefined);
				startPolling(UNREAD_POLL_MS);
			} else {
				stopPolling();
			}
		};
		if (document.visibilityState === 'visible') startPolling(UNREAD_POLL_MS);
		document.addEventListener('visibilitychange', sync);
		return () => {
			document.removeEventListener('visibilitychange', sync);
			stopPolling();
		};
	}, [user, poll, startPolling, stopPolling, refetch]);

	return user ? data?.getUnreadNotificationCount ?? 0 : 0;
}
