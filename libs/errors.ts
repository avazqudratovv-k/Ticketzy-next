import { ApolloError } from '@apollo/client';

/** What callers get from a failed operation: the server's own code and message, never a popup. */
export interface ApiError {
	code: string;
	message: string;
	/** Only with `VALIDATION_FAILED`: the failed inputs, from the top-level `fields` of the GraphQL error. */
	fields?: FieldIssue[];
	/** Only with `RATE_LIMITED`: whole seconds until the client may try again. */
	retryAfterSeconds?: number;
}

/** One failed input: the property name (dotted for nested input) and the class-validator rule names. The server never sends values. */
export interface FieldIssue {
	field: string;
	rules: string[];
}

export const NETWORK_ERROR = 'NETWORK_ERROR';
/** Code of a rejected input (backend decision #113); it replaced the bare `BAD_REQUEST` for validation failures. */
export const VALIDATION_FAILED = 'VALIDATION_FAILED';
/** Code of a GraphQL error when the database is unreachable or payments are switched off (backend decisions #92, #97). */
export const SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE';

/** Server messages (libs/enums/common.enum.ts in the backend) that the UI shows translated. Keys are in auth.json. */
const KNOWN_MESSAGES: Record<string, string> = {
	'Incorrect email or password!': 'errors.wrongCredentials',
	'Your account was not verified. Please contact support.': 'errors.notVerified',
	'Already used member email, nick or phone': 'errors.alreadyUsed',
	'This value is already in use!': 'errors.alreadyUsed',
	'The service is temporarily unavailable, please try again in a moment!': 'errors.serviceUnavailable',
};

export const knownMessageKey = (error: ApiError): string | undefined =>
	KNOWN_MESSAGES[error.message] ??
	(error.code === SERVICE_UNAVAILABLE ? 'errors.serviceUnavailable' : error.code === VALIDATION_FAILED ? 'errors.validationFailed' : undefined);

/** The same rule for the namespaces that key their messages without the `errors.` prefix (`serverErrors.<key>`). */
export const serviceUnavailableKey = (code: string): string | undefined =>
	code === SERVICE_UNAVAILABLE ? 'serviceUnavailable' : code === VALIDATION_FAILED ? 'badRequest' : undefined;

/** Reads the `fields` list defensively: anything that is not `{ field: string, rules: string[] }` is dropped. */
function readFields(raw: unknown): FieldIssue[] | undefined {
	if (!Array.isArray(raw)) return undefined;
	const list = raw.flatMap((item): FieldIssue[] => {
		const { field, rules } = (item ?? {}) as { field?: unknown; rules?: unknown };
		if (typeof field !== 'string') return [];
		return [{ field, rules: Array.isArray(rules) ? rules.filter((rule): rule is string => typeof rule === 'string') : [] }];
	});
	return list.length > 0 ? list : undefined;
}

/**
 * The API formats errors as `{ code, message }` at the top level of each GraphQL error
 * (see formatError in the backend app.module); `extensions.code` is read as a fallback.
 */
export function parseApiError(err: unknown): ApiError {
	if (err instanceof ApolloError) {
		const first = err.graphQLErrors?.[0] as
			| { code?: string; message?: string; fields?: unknown; retryAfterSeconds?: unknown; extensions?: { code?: string; fields?: unknown } }
			| undefined;
		if (first) {
			const fields = readFields(first.fields ?? first.extensions?.fields);
			return {
				code: first.code ?? first.extensions?.code ?? 'UNKNOWN',
				message: first.message ?? err.message,
				...(fields ? { fields } : {}),
				...(typeof first.retryAfterSeconds === 'number' ? { retryAfterSeconds: first.retryAfterSeconds } : {}),
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
