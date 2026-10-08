import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { EventStatus } from '../types/event';
import { isEventStatus, isSortKey, SortKey } from './events';

export const LIST_PAGE_SIZE = 10;

export interface ListState {
	status: EventStatus | '';
	q: string;
	sort: SortKey;
	page: number;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

/** Status tab, search, sort and page of the organizer's events list live in the URL, so reload and back keep the view. */
export default function useListState() {
	const router = useRouter();
	const query = router.query;

	const state: ListState = useMemo(() => {
		const status = first(query.status).toUpperCase();
		const sort = first(query.sort);
		const page = parseInt(first(query.page), 10);
		return {
			status: isEventStatus(status) ? status : '',
			q: first(query.q).slice(0, 100),
			sort: isSortKey(sort) ? sort : 'dateAsc',
			page: Number.isInteger(page) && page > 0 ? page : 1,
		};
	}, [query]);

	const update = useCallback(
		(patch: Partial<ListState>, mode: 'push' | 'replace' = 'push') => {
			const next = { ...state, ...patch };
			if (!('page' in patch)) next.page = 1;
			const params: Record<string, string> = {};
			if (next.status) params.status = next.status.toLowerCase();
			if (next.q.trim()) params.q = next.q.trim();
			if (next.sort !== 'dateAsc') params.sort = next.sort;
			if (next.page > 1) params.page = String(next.page);
			return router[mode]({ pathname: router.pathname, query: params }, undefined, { shallow: true, scroll: false });
		},
		[router, state],
	);

	return { state, update, ready: router.isReady };
}
