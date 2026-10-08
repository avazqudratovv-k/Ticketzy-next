/** Plain GraphQL fetch for getServerSideProps (the Apollo client only has a link in the browser). Anonymous. */
export async function serverQuery<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
	const uri = process.env.NEXT_PUBLIC_API_GRAPHQL_URL;
	if (!uri) return null;
	try {
		const res = await fetch(uri, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ query, variables }),
		});
		const json = await res.json();
		return json?.data ?? null;
	} catch {
		return null;
	}
}
