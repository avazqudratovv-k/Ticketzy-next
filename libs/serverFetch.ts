/** A sleeping backend (cold start) must not hold a page render; callers already treat `null` as "no data" (F339). */
export const SERVER_QUERY_TIMEOUT_MS = 8000;

/** Plain GraphQL fetch for getServerSideProps (the Apollo client only has a link in the browser). Anonymous. Returns null on any failure, including the 8 s deadline. */
export async function serverQuery<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
	const uri = process.env.NEXT_PUBLIC_API_GRAPHQL_URL;
	if (!uri) return null;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), SERVER_QUERY_TIMEOUT_MS);
	try {
		const res = await fetch(uri, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ query, variables }),
			signal: controller.signal,
		});
		const json = await res.json();
		return json?.data ?? null;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}
