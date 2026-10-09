import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

/**
 * Tab, filters, search, sort and page of an admin list live in the URL, so reload, back and shared links keep the view.
 * Values are plain strings; `defaults` also lists the keys, `valid` rejects unknown values (they fall back to the default).
 */
export default function useListParams<S extends Record<string, string>>(defaults: S, valid: { [K in keyof S]?: (value: string) => boolean } = {}) {
	const router = useRouter();
	const query = router.query;

	const state = useMemo(() => {
		const out: Record<string, string> = {};
		for (const key of Object.keys(defaults)) {
			let value = first(query[key]);
			if (key === 'q') value = value.slice(0, 100);
			const check = valid[key as keyof S];
			out[key] = value && (!check || check(value)) ? value : defaults[key];
		}
		const page = parseInt(first(query.page), 10);
		return { values: out as S, page: Number.isInteger(page) && page > 0 ? page : 1 };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query]);

	const update = useCallback(
		(patch: Partial<S> & { page?: number }, mode: 'push' | 'replace' = 'push') => {
			const next: Record<string, string> = { ...state.values, ...(patch as Record<string, string>) };
			delete next.page;
			const page = 'page' in patch && patch.page ? patch.page : 'page' in patch ? 1 : Object.keys(patch).length ? 1 : state.page;
			const params: Record<string, string> = {};
			for (const key of Object.keys(defaults)) {
				const value = (next[key] ?? '').trim();
				if (value && value !== defaults[key]) params[key] = value;
			}
			if (page > 1) params.page = String(page);
			return router[mode]({ pathname: router.pathname, query: params }, undefined, { shallow: true, scroll: false });
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[router, state],
	);

	return { ...state, update, ready: router.isReady };
}
