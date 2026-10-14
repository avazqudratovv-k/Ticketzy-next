import { ApolloLink, Observable } from '@apollo/client';
import { RetryLink } from '@apollo/client/link/retry';
import { getMainDefinition } from '@apollo/client/utilities';

/** A query that has not answered after this long ends in the error state (with Retry). */
export const QUERY_TIMEOUT_MS = 20_000;
/** Mutations are not cut short as quickly: the server may have done the work. Still bounded, so nothing waits forever. */
export const MUTATION_TIMEOUT_MS = 60_000;
/** How long a request may be pending before the page says the server is waking up. */
export const WAKE_NOTE_AFTER_MS = 5_000;

export const TIMEOUT_MESSAGE = 'Request timed out';

const isMutation = (operation: { query: Parameters<typeof getMainDefinition>[0] }) => {
	const definition = getMainDefinition(operation.query);
	return definition.kind === 'OperationDefinition' && definition.operation === 'mutation';
};

/** Tells the fetch wrapper how long this operation may take (read from `fetchOptions`, which the upload link passes on). */
export const timeoutLink = new ApolloLink((operation, forward) => {
	operation.setContext(({ fetchOptions = {} }: { fetchOptions?: Record<string, unknown> }) => ({
		fetchOptions: { ...fetchOptions, timeoutMs: isMutation(operation) ? MUTATION_TIMEOUT_MS : QUERY_TIMEOUT_MS },
	}));
	return forward(operation);
});

/**
 * `fetch` with a deadline. A request with files (multipart `FormData`: image uploads) is never timed out, and neither
 * is anything that does not carry a `timeoutMs`. The timeout surfaces as a network error, which the pages already
 * show as the "could not load" state with Retry.
 */
export const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit & { timeoutMs?: number }): Promise<Response> => {
	const { timeoutMs, ...options } = init ?? {};
	if (!timeoutMs || options.body instanceof FormData) return fetch(input, options);

	const controller = new AbortController();
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, timeoutMs);
	const outer = options.signal;
	const forward = () => controller.abort();
	if (outer) {
		if (outer.aborted) controller.abort();
		else outer.addEventListener('abort', forward, { once: true });
	}
	return fetch(input, { ...options, signal: controller.signal })
		.catch((error) => {
			throw timedOut ? new Error(TIMEOUT_MESSAGE) : error;
		})
		.finally(() => {
			clearTimeout(timer);
			outer?.removeEventListener('abort', forward);
		});
};

/**
 * Queries that failed before an answer (connection dropped, request aborted by the browser) are sent once more.
 * Mutations are never repeated, and a timeout is not retried here: the page shows its error state and the visitor
 * decides. A GraphQL error is an answer, not a failure of the connection, and never reaches this link.
 */
export const retryLink = new RetryLink({
	delay: { initial: 400, max: 400, jitter: false },
	attempts: (count, operation, error) =>
		count < 2 && !isMutation(operation) && !(error instanceof Error && error.message === TIMEOUT_MESSAGE),
});

/**
 * Queries in flight and whether the last query ended without an answer, for the "server is waking up" note
 * (`useWakeNote`, F349). Only queries count: mutations and uploads are slow for their own reasons and their forms
 * show their own errors.
 */
const pending = new Map<number, number>();
const listeners = new Set<() => void>();
let nextId = 0;
let unreachable = false;

const notify = () => listeners.forEach((listener) => listener());

const setUnreachable = (value: boolean) => {
	if (unreachable === value) return;
	unreachable = value;
	notify();
};

/** No answer at all (network error, timeout) or a gateway/server error of a sleeping host. A 4xx (a refused token) is an answer. */
const isNoAnswer = (error: unknown) => {
	const status = (error as { statusCode?: number } | undefined)?.statusCode;
	return status === undefined || status >= 500;
};

export const pendingStore = {
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
	/** Start time of the oldest query in flight, or null. */
	oldest: () => (pending.size ? Math.min(...Array.from(pending.values())) : null),
	/** True from a query that failed without an answer until the next query that is answered. */
	unreachable: () => unreachable,
};

export const trackLink = new ApolloLink((operation, forward) => {
	if (isMutation(operation)) return forward(operation);
	return new Observable((observer) => {
		const id = nextId++;
		pending.set(id, Date.now());
		notify();
		const done = () => {
			if (pending.delete(id)) notify();
		};
		const subscription = forward(operation).subscribe({
			next: (value) => {
				setUnreachable(false);
				observer.next(value);
			},
			error: (error) => {
				done();
				if (isNoAnswer(error)) setUnreachable(true);
				observer.error(error);
			},
			complete: () => {
				done();
				observer.complete();
			},
		});
		return () => {
			done();
			subscription.unsubscribe();
		};
	});
});
