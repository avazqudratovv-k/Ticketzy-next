import { parseApiError, NETWORK_ERROR, VALIDATION_FAILED } from '../errors';
import { AssistantErrorKind } from '../types/assistant';

/** Backend limits (apps/ticketzy-api libs/dto/ai/ai.input.ts). */
export const ASSISTANT_MAX_MESSAGE_LENGTH = 1000;
export const ASSISTANT_MAX_HISTORY = 10;

/** The backend's own wait is about 15 s, retried once (about 31 s worst case); the browser gives up a little after. */
export const ASSISTANT_CLIENT_TIMEOUT_MS = 40_000;
/** After this long the panel says the answer is taking a while. */
export const ASSISTANT_SLOW_AFTER_MS = 10_000;

/** Server messages (Message.AI_* in the backend's common.enum.ts) mapped to the kinds the UI words. */
const MESSAGES: Record<string, AssistantErrorKind> = {
	'AI features are turned off on this server.': 'unavailable',
	'AI features are enabled but not configured on this server.': 'unavailable',
	'You are using the AI features too fast, please try again in a minute!': 'rateLimit',
	'The AI service could not answer right now, please try again later!': 'failed',
	'The AI is busy right now, please try again in a moment.': 'busy',
	'The AI service took too long to answer, please try again later!': 'timeout',
	'The AI service returned an answer that could not be used!': 'failed',
};

export const TIMEOUT_CODE = 'CLIENT_TIMEOUT';

/** Validation errors arrive as `VALIDATION_FAILED` (a bare `BAD_REQUEST` before backend #113), so the code is the signal for empty or too long. */
export function assistantErrorKind(err: unknown): AssistantErrorKind {
	const { code, message } = parseApiError(err);
	if (code === TIMEOUT_CODE) return 'timeout';
	if (code === NETWORK_ERROR) return 'network';
	const known = MESSAGES[message];
	if (known) return known;
	if (code === VALIDATION_FAILED || code === 'BAD_REQUEST') return 'invalid';
	if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') return 'notAllowed';
	if (code === 'TOO_MANY_REQUESTS') return 'rateLimit';
	return 'failed';
}

/** Turning the AI off or a rejected message does not get better by asking again. */
export const isRetryable = (kind: AssistantErrorKind) => kind !== 'unavailable' && kind !== 'invalid' && kind !== 'notAllowed';
