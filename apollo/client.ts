import { useMemo } from 'react';
import { ApolloClient, ApolloLink, InMemoryCache, from, NormalizedCacheObject } from '@apollo/client';
import createUploadLink from 'apollo-upload-client/public/createUploadLink.js';
import { onError } from '@apollo/client/link/error';
import { getJwtToken } from '../libs/auth/token';
import { handleSessionExpired, isSessionExpiryPaused, SESSION_FREE_OPERATIONS } from '../libs/auth/sessionExpired';
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
		const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
			// A token the server refuses ends the session once (libs/auth/sessionExpired.ts). Only UNAUTHENTICATED counts:
			// FORBIDDEN is a role problem, and a wrong password on login/signup is not an expiry.
			// A multipart upload with a refused token is answered 401 before GraphQL runs (backend decision #98): a network-level error.
			const unauthenticated =
				graphQLErrors?.some((error) => (error as { code?: string }).code === 'UNAUTHENTICATED' || error.extensions?.code === 'UNAUTHENTICATED') ||
				(networkError as { statusCode?: number } | undefined)?.statusCode === 401;
			if (!SESSION_FREE_OPERATIONS.has(operation.operationName) && unauthenticated) {
				const sent = (operation.getContext().headers?.Authorization as string | undefined)?.replace(/^Bearer /, '');
				handleSessionExpired(sent);
			}
			// While the account-deleted window is up, requests with the dead token are expected to fail (F364)
			if (process.env.NODE_ENV !== 'development' || isSessionExpiryPaused()) return;
			graphQLErrors?.forEach((error) => {
				const { message, locations, path } = error;
				// A rejected input is shown under its field by the form (libs/fieldErrors.ts), and a blocked deletion or a recently deleted email has its own message, so none is a red line
				if (['VALIDATION_FAILED', 'ACCOUNT_DELETE_BLOCKED', 'EMAIL_RECENTLY_DELETED'].includes((error as { code?: string }).code ?? '')) return;
				// The backend answers an empty list with "No data found!"; callers treat it as an empty result (isOnlyNoData), so it is not an error worth a red line
				if (message === 'No data found!') return;
				// An event that is over is an expected state with its own screen (backend #121, F355), not a red line
				if ((error as { code?: string }).code === 'EVENT_ENDED') return;
				console.error(`[GraphQL error]: ${message}`, { locations, path });
			});
			if (networkError) console.error(`[Network error]: ${networkError}`);
		});

		return from([errorLink, trackLink, retryLink, authLink, timeoutLink, uploadLink]);
	}
	// Server render: no link, nothing is fetched there (pages use serverQuery)
	return undefined;
}

function createApolloClient() {
	return new ApolloClient({
		ssrMode: typeof window === 'undefined',
		link: createIsomorphicLink(),
		cache: new InMemoryCache(),
	});
}

export function initializeApollo() {
	const _apolloClient = apolloClient ?? createApolloClient();
	if (typeof window === 'undefined') return _apolloClient;
	if (!apolloClient) apolloClient = _apolloClient;

	return _apolloClient;
}

export function useApollo() {
	return useMemo(() => initializeApollo(), []);
}
