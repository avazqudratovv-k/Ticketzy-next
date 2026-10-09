import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { GET_ADMIN_EVENT_COUNT, ADMIN_EVENT_STATUS_KEYS } from '../../apollo/admin/query';

export type AdminEventCounts = Record<'ALL' | (typeof ADMIN_EVENT_STATUS_KEYS)[number], number>;

const EMPTY = Object.fromEntries(['ALL', ...ADMIN_EVENT_STATUS_KEYS].map((key) => [key, 0])) as AdminEventCounts;

/**
 * Tab counts of the admin events page. Each status is its own request: the backend answers an empty status with
 * "No data found!" and nulls the whole document, so one request for all statuses showed 0 everywhere as soon as one
 * status was empty. A failed request counts as 0 for that status only.
 */
export default function useAdminEventCounts(skip: boolean): AdminEventCounts {
	const client = useApolloClient();
	const [counts, setCounts] = useState<AdminEventCounts>(EMPTY);

	useEffect(() => {
		if (skip) return undefined;
		let active = true;
		(['ALL', ...ADMIN_EVENT_STATUS_KEYS] as const).forEach((key) => {
			const search = key === 'ALL' ? {} : { eventStatus: key };
			client
				.query({
					query: GET_ADMIN_EVENT_COUNT,
					variables: { input: { page: 1, limit: 1, search } },
					fetchPolicy: 'network-only',
					errorPolicy: 'all',
				})
				.then((result) => result.data?.getEventsByAdmin?.metaCounter?.[0]?.total ?? 0)
				.catch(() => 0)
				.then((total) => active && setCounts((prev) => ({ ...prev, [key]: total })));
		});
		return () => {
			active = false;
		};
	}, [client, skip]);

	return counts;
}
