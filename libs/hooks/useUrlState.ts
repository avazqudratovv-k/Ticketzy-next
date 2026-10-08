import { useCallback } from 'react';
import { useRouter } from 'next/router';

/** Page number and one extra key (tab, status) kept in the URL, so reload, back and shared links keep the view. */
export default function useUrlState(key: string) {
	const router = useRouter();
	const rawPage = Number(router.query.page);
	const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
	const value = typeof router.query[key] === 'string' ? (router.query[key] as string) : '';

	const update = useCallback(
		(next: { page?: number; value?: string }) => {
			const query: Record<string, string | string[] | undefined> = { ...router.query };
			if (next.value !== undefined) {
				if (next.value) query[key] = next.value;
				else delete query[key];
			}
			const nextPage = next.page ?? (next.value !== undefined ? 1 : page);
			if (nextPage > 1) query.page = String(nextPage);
			else delete query.page;
			return router.push({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
		},
		[router, key, page],
	);

	return { page, value, ready: router.isReady, update };
}
