import { parseApiError, NETWORK_ERROR, VALIDATION_FAILED } from '../errors';
import { aiCause, AiCause } from '../aiErrors';
import { AssistantErrorKind } from '../types/assistant';

/** Backend limits (apps/ticketzy-api libs/dto/ai/ai.input.ts). */
export const ASSISTANT_MAX_MESSAGE_LENGTH = 1000;
export const ASSISTANT_MAX_HISTORY = 10;

/** The backend's own wait is about 15 s, retried once (about 31 s worst case); the browser gives up a little after. */
export const ASSISTANT_CLIENT_TIMEOUT_MS = 40_000;
/** After this long the panel says the answer is taking a while. */
export const ASSISTANT_SLOW_AFTER_MS = 10_000;

/** The shared cause (libs/aiErrors.ts) mapped to the kinds the panel words. */
const KINDS: Record<AiCause, AssistantErrorKind> = {
	disabled: 'unavailable',
	notConfigured: 'unavailable',
	rateLimited: 'rateLimit',
	dailyCap: 'dailyCap',
	quotaExhausted: 'quotaExhausted',
	busy: 'busy',
	failed: 'failed',
	timeout: 'timeout',
	invalid: 'failed',
	locales: 'failed',
	notChecked: 'failed',
};

export const TIMEOUT_CODE = 'CLIENT_TIMEOUT';

/** Validation errors arrive as `VALIDATION_FAILED` (a bare `BAD_REQUEST` before backend #113), so the code is the signal for empty or too long. */
export function assistantErrorKind(err: unknown): AssistantErrorKind {
	const parsed = parseApiError(err);
	const { code } = parsed;
	if (code === TIMEOUT_CODE) return 'timeout';
	if (code === NETWORK_ERROR) return 'network';
	const cause = aiCause(parsed);
	if (cause) return KINDS[cause];
	if (code === VALIDATION_FAILED || code === 'BAD_REQUEST') return 'invalid';
	if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') return 'notAllowed';
	return 'failed';
}

/** Turning the AI off, a rejected message or a used-up day does not get better by asking again. */
export const isRetryable = (kind: AssistantErrorKind) =>
	kind !== 'unavailable' && kind !== 'invalid' && kind !== 'notAllowed' && kind !== 'quotaExhausted' && kind !== 'dailyCap';
