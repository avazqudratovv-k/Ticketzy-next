import { ApiError } from './errors';

/** What went wrong with an AI request, whichever screen asked (assistant, organizer translation, admin check). */
export type AiCause =
	| 'disabled'
	| 'notConfigured'
	| 'rateLimited'
	| 'dailyCap'
	| 'quotaExhausted'
	| 'busy'
	| 'failed'
	| 'timeout'
	| 'invalid'
	| 'locales'
	| 'notChecked';

/**
 * Error codes of the backend (CodedException in the AI module and the rate limit code). The code wins over the text.
 * `TOO_MANY_REQUESTS` is the code Nest gives the plain 429 of the per-minute AI limit (no CodedException).
 * The other AI refusals (busy, failed, off, ...) have no code of their own, so they are told apart by message below.
 */
const CODES: Record<string, AiCause> = {
	AI_QUOTA_EXHAUSTED: 'quotaExhausted',
	AI_DAILY_CAP_REACHED: 'dailyCap',
	RATE_LIMITED: 'rateLimited',
	TOO_MANY_REQUESTS: 'rateLimited',
};

/** Fallback for answers without a usable code (Message.AI_* in the backend's common.enum.ts). */
const MESSAGES: Record<string, AiCause> = {
	'AI features are turned off on this server.': 'disabled',
	'AI features are enabled but not configured on this server.': 'notConfigured',
	'You are using the AI features too fast, please try again in a minute!': 'rateLimited',
	'The AI service could not answer right now, please try again later!': 'failed',
	'The AI is busy right now, please try again in a moment.': 'busy',
	'The AI is resting for today, please try again later.': 'quotaExhausted',
	'The AI service took too long to answer, please try again later!': 'timeout',
	'The AI service returned an answer that could not be used!': 'invalid',
	'Choose at least one target language (en, ko, ru, uz)!': 'locales',
	'The AI check did not run for this event.': 'notChecked',
	'The AI assistant has reached its limit for today, please try again tomorrow!': 'dailyCap',
	'You have used all your AI requests for today, please try again tomorrow!': 'dailyCap',
};

/** `RATE_LIMITED` with a retry hint this long is the per-caller daily limit (reset at 00:00 UTC), not a pause of a minute. */
const DAILY_RETRY_AFTER_SECONDS = 600;

/** The cause of an AI error: by code first, by the old message text when the code says nothing. */
export function aiCause({ code, message, retryAfterSeconds }: Pick<ApiError, 'code' | 'message'> & { retryAfterSeconds?: number }): AiCause | undefined {
	const byMessage = MESSAGES[message];
	if (code === 'RATE_LIMITED' && (byMessage === 'dailyCap' || (retryAfterSeconds ?? 0) > DAILY_RETRY_AFTER_SECONDS)) return 'dailyCap';
	return CODES[code] ?? byMessage;
}

/** A used-up day does not come back by asking again. */
export const isDailyLimit = (cause: AiCause | undefined) => cause === 'dailyCap' || cause === 'quotaExhausted';
