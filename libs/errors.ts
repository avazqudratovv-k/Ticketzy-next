import { ApolloError } from '@apollo/client';

/** What callers get from a failed operation: the server's own code and message, never a popup. */
export interface ApiError {
	code: string;
	message: string;
}

export const NETWORK_ERROR = 'NETWORK_ERROR';

/** Server messages (libs/enums/common.enum.ts in the backend) that the UI shows translated. Keys are in auth.json. */
const KNOWN_MESSAGES: Record<string, string> = {
	'Incorrect email or password!': 'errors.wrongCredentials',
	'Your account was not verified. Please contact support.': 'errors.notVerified',
	'Already used member email, nick or phone': 'errors.alreadyUsed',
};

export const knownMessageKey = (error: ApiError): string | undefined => KNOWN_MESSAGES[error.message];

/**
 * The API formats errors as `{ code, message }` at the top level of each GraphQL error
 * (see formatError in the backend app.module); `extensions.code` is read as a fallback.
 */
export function parseApiError(err: unknown): ApiError {
	if (err instanceof ApolloError) {
		const first = err.graphQLErrors?.[0] as { code?: string; message?: string; extensions?: { code?: string } } | undefined;
		if (first) {
			return {
				code: first.code ?? first.extensions?.code ?? 'UNKNOWN',
				message: first.message ?? err.message,
			};
		}
		if (err.networkError) return { code: NETWORK_ERROR, message: err.networkError.message };
		return { code: 'UNKNOWN', message: err.message };
	}
	if (isApiError(err)) return err;
	return { code: 'UNKNOWN', message: err instanceof Error ? err.message : String(err) };
}

export const isApiError = (value: unknown): value is ApiError =>
	typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
