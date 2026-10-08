import { useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { MARK_ALL_NOTIFICATIONS_READ, MARK_NOTIFICATION_READ } from '../../apollo/user/mutation';

/** Mark one or all notifications as read. Counts and lists refetch afterwards, so the bell, the page and the sidebar agree. */
export default function useNotificationActions() {
	const refetchQueries = ['GetUnreadNotificationCount', 'GetMyNotifications'];
	const [markOne] = useMutation(MARK_NOTIFICATION_READ, { refetchQueries });
	const [markAll, { loading: markingAll }] = useMutation(MARK_ALL_NOTIFICATIONS_READ, { refetchQueries });

	const markRead = useCallback(
		(notificationId: string) => markOne({ variables: { notificationId } }).catch(() => undefined),
		[markOne],
	);
	const markAllRead = useCallback(() => markAll().catch(() => undefined), [markAll]);
	return { markRead, markAllRead, markingAll };
}
