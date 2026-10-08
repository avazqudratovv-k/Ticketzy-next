import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { CategorySlug, CATEGORY_SLUGS, EventSortKey, EVENT_SORTS, isCategorySlug, isSortKey } from '../events';
import { dayBoundaryIso } from '../format';

export const PAGE_SIZE = 12;
const MAX_PRICE = 1_000_000_000;

export interface EventFilters {
	q: string;
	category: CategorySlug | '';
	city: string;
	from: string;
	to: string;
	min: string;
	max: string;
	sort: EventSortKey;
	page: number;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';
const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const digits = (value: string) => (/^\d{1,9}$/.test(value) ? value : '');

/** The events list state lives in the URL query, so filters survive a reload and can be shared. Bad values are ignored. */
export function useEventFilters() {
	const router = useRouter();
	const query = router.query;

	const filters: EventFilters = useMemo(() => {
		const category = first(query.category);
		const sort = first(query.sort);
		const from = first(query.from);
		const to = first(query.to);
		const page = parseInt(first(query.page), 10);
		return {
			q: first(query.q).slice(0, 100),
			category: isCategorySlug(category) ? category : '',
			city: first(query.city).slice(0, 60),
			from: isDay(from) ? from : '',
			to: isDay(to) ? to : '',
			min: digits(first(query.min)),
			max: digits(first(query.max)),
			sort: isSortKey(sort) ? sort : 'date',
			page: Number.isInteger(page) && page > 0 ? page : 1,
		};
	}, [query]);

	/** Changing a filter goes back to page 1; a change of page keeps the rest. `history: replace` for typing. */
	const update = useCallback(
		(patch: Partial<EventFilters>, mode: 'push' | 'replace' = 'push') => {
			const next = { ...filters, ...patch };
			if (!('page' in patch)) next.page = 1;
			const params: Record<string, string> = {};
			if (next.q.trim()) params.q = next.q.trim();
			if (next.category) params.category = next.category;
			if (next.city) params.city = next.city;
			if (next.from) params.from = next.from;
			if (next.to) params.to = next.to;
			if (next.min) params.min = next.min;
			if (next.max) params.max = next.max;
			if (next.sort !== 'date') params.sort = next.sort;
			if (next.page > 1) params.page = String(next.page);
			return router[mode]({ pathname: router.pathname, query: params }, undefined, { shallow: true, scroll: false });
		},
		[filters, router],
	);

	const clear = useCallback(
		() => router.push({ pathname: router.pathname }, undefined, { shallow: true, scroll: false }),
		[router],
	);

	const activeCount = [filters.category, filters.city, filters.from, filters.to, filters.min || filters.max].filter(
		Boolean,
	).length;
	const hasAny = activeCount > 0 || Boolean(filters.q);

	return { filters, update, clear, ready: router.isReady, activeCount, hasAny };
}

/** The `getEvents` input for a set of filters. */
export function buildEventsInput(filters: EventFilters) {
	const search: Record<string, unknown> = {};
	if (filters.q.trim()) search.text = filters.q.trim();
	if (filters.category) search.categoryList = CATEGORY_SLUGS.find((c) => c.slug === filters.category)?.list;
	if (filters.city) search.cityList = [filters.city];
	if (filters.min || filters.max) {
		search.pricesRange = { start: Number(filters.min || 0), end: Number(filters.max || MAX_PRICE) };
	}
	if (filters.from || filters.to) {
		search.periodsRange = {
			start: filters.from ? dayBoundaryIso(filters.from, false) : '2000-01-01T00:00:00.000Z',
			end: filters.to ? dayBoundaryIso(filters.to, true) : '2100-01-01T00:00:00.000Z',
		};
	}
	const { sort, direction } = EVENT_SORTS[filters.sort];
	return { page: filters.page, limit: PAGE_SIZE, sort, direction, search };
}
