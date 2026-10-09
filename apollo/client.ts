import { useMemo } from 'react';
import { ApolloClient, ApolloLink, InMemoryCache, from, NormalizedCacheObject } from '@apollo/client';
import createUploadLink from 'apollo-upload-client/public/createUploadLink.js';
import { onError } from '@apollo/client/link/error';
import { getJwtToken } from '../libs/auth/token';
import { fetchWithTimeout, retryLink, timeoutLink, trackLink } from './resilience';

let apolloClient: ApolloClient<NormalizedCacheObject>;

function getHeaders(): Record<string, string> {
	const token = getJwtToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

function createIsomorphicLink() {
	if (typeof window !== 'undefined') {
		// Bearer token on every request; the chat WebSocket will send it in its first `auth` message instead.
		const authLink = new ApolloLink((operation, forward) => {
			operation.setContext(({ headers = {} }) => ({
				headers: {
					...headers,
					...getHeaders(),
				},
			}));
			return forward(operation);
		});

		const uploadLink = createUploadLink({
			uri: process.env.NEXT_PUBLIC_API_GRAPHQL_URL,
			// Deadline per request (queries 20 s); uploads and the websocket are exempt, see resilience.ts
			fetch: fetchWithTimeout,
			// Apollo Server's CSRF protection rejects multipart uploads without this header
			headers: { 'apollo-require-preflight': 'true' },
		});

		// No popups here: errors reach the caller (see parseApiError in libs/errors). Logged in development only.
		const errorLink = onError(({ graphQLErrors, networkError }) => {
			if (process.env.NODE_ENV !== 'development') return;
			graphQLErrors?.forEach(({ message, locations, path }) => {
				// The backend answers an empty list with "No data found!"; callers treat it as an empty result (isOnlyNoData), so it is not an error worth a red line
				if (message === 'No data found!') return;
				console.error(`[GraphQL error]: ${message}`, { locations, path });
			});
			if (networkError) console.error(`[Network error]: ${networkError}`);
		});

		return from([errorLink, trackLink, retryLink, authLink, timeoutLink, uploadLink]);
	}
}

function createApolloClient() {
	return new ApolloClient({
		ssrMode: typeof window === 'undefined',
		link: createIsomorphicLink(),
		cache: new InMemoryCache(),
	});
}

export function initializeApollo(initialState = null) {
	const _apolloClient = apolloClient ?? createApolloClient();
	if (initialState) _apolloClient.cache.restore(initialState);
	if (typeof window === 'undefined') return _apolloClient;
	if (!apolloClient) apolloClient = _apolloClient;

	return _apolloClient;
}

export function useApollo(initialState: any) {
	return useMemo(() => initializeApollo(initialState), [initialState]);
}
