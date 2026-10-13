import { useCallback, useEffect, useRef, useState } from 'react';
import { ApolloError, DocumentNode, useApolloClient } from '@apollo/client';

/** The backend refuses a `limit` above this (backend decision #91; default 20). Only `EventsByAdminInquiry` takes 200. */
export const MAX_PAGE_SIZE = 100;

interface Block {
	list: unknown[];
	metaCounter: { total: number }[];
}

/**
 * Loads up to `maxRows` rows of a `{ list, metaCounter }` query in pages of `MAX_PAGE_SIZE` (the query takes `$input`).
 * The result has the shape `useQuery` would give for a single big page, so callers keep reading `data[field].list` and
 * `metaCounter[0].total`. A later page that fails keeps the rows already loaded (the callers show their "partial"
 * note because total > loaded); the error is only reported when nothing loaded.
 */
export default function usePagedQuery(query: DocumentNode, field: string, input: Record<string, unknown>, options: { skip?: boolean; maxRows: number }) {
	const client = useApolloClient();
	const { skip = false, maxRows } = options;
	const [data, setData] = useState<Record<string, Block> | undefined>(undefined);
	const [error, setError] = useState<ApolloError | undefined>(undefined);
	const [loading, setLoading] = useState(false);
	const run = useRef(0);
	const key = JSON.stringify(input);

	const load = useCallback(async () => {
		const id = ++run.current;
		setLoading(true);
		setError(undefined);
		const list: unknown[] = [];
		let total = 0;
		try {
			for (let page = 1; list.length < maxRows; page++) {
				const { data: res } = await client.query({
					query,
					variables: { input: { ...JSON.parse(key), page, limit: MAX_PAGE_SIZE } },
					fetchPolicy: 'network-only',
				});
				const block = res[field] as Block;
				total = block.metaCounter?.[0]?.total ?? 0;
				list.push(...block.list);
				if (list.length >= total || block.list.length === 0) break;
			}
			if (id === run.current) setData({ [field]: { list, metaCounter: [{ total }] } });
		} catch (err) {
			if (id !== run.current) return;
			if (list.length > 0) setData({ [field]: { list, metaCounter: [{ total }] } });
			else setError(err as ApolloError);
		} finally {
			if (id === run.current) setLoading(false);
		}
	}, [client, query, field, key, maxRows]);

	useEffect(() => {
		if (skip) return undefined;
		void load();
		return () => {
			run.current++;
		};
	}, [skip, load]);

	return { data, error, loading, refetch: load };
}
