import { parseApiError, NETWORK_ERROR } from '../errors';
import { isTicketCode, normalizeTicketCode } from '../ticketCode';

/**
 * What a scan means for the person at the gate. Backend messages (libs/enums/common.enum.ts, DECISIONS #53) are matched exactly;
 * anything else is `error` and the server's words are shown.
 */
export type ScanOutcome =
	| 'valid'
	| 'used'
	| 'wrongEvent'
	| 'refunded'
	| 'invalid'
	| 'notOpen'
	| 'notAllowed'
	| 'codeNotFound'
	| 'badCode'
	| 'rateLimited'
	| 'network'
	| 'error';

/** Backend error codes (libs/enums/common.enum.ts keys); read first, the message below is the fallback (as F350 does for the AI). */
const CODES: Record<string, ScanOutcome> = {
	TICKET_ALREADY_USED: 'used',
	TICKET_WRONG_EVENT: 'wrongEvent',
	TICKET_WRONG_ORGANIZER: 'wrongEvent',
	TICKET_REFUNDED: 'refunded',
	QR_INVALID: 'invalid',
	TICKET_NOT_VALID: 'invalid',
	EVENT_NOT_OPEN_FOR_CHECKIN: 'notOpen',
	TICKET_CODE_NOT_FOUND: 'codeNotFound',
	RATE_LIMITED: 'rateLimited',
};

const MESSAGES: Record<string, ScanOutcome> = {
	'This ticket was already checked in!': 'used',
	'This ticket is for another event!': 'wrongEvent',
	'This ticket belongs to an event of another organizer!': 'wrongEvent',
	'This ticket was refunded!': 'refunded',
	'This QR code is not valid!': 'invalid',
	'This ticket is not valid!': 'invalid',
	'Check-in is only possible for an approved event!': 'notOpen',
	'Not Allowed Request!': 'notAllowed',
};

export function classifyScan(err: unknown): { outcome: ScanOutcome; raw: string; retryAfterSeconds?: number } {
	const parsed = parseApiError(err);
	if (parsed.code === NETWORK_ERROR) return { outcome: 'network', raw: '' };
	const raw = Array.isArray(parsed.message) ? parsed.message.join(' ') : String(parsed.message ?? '');
	const outcome = CODES[parsed.code] ?? MESSAGES[raw] ?? 'error';
	return { outcome, raw, ...(outcome === 'rateLimited' && parsed.retryAfterSeconds ? { retryAfterSeconds: parsed.retryAfterSeconds } : {}) };
}

/** The camera gives the QR text; a typed value may carry spaces or line breaks from a paste. */
export const cleanToken = (value: string) => value.trim().replace(/\s+/g, '');

/** The long text inside the QR code: 24 hex characters (ticket id), a dot, 64 hex characters (signature). The same format check as the backend. */
const QR_TOKEN = /^[a-f0-9]{24}\.[a-f0-9]{64}$/;

/**
 * What the manual box holds: a pasted QR token (token operations), a typed ticket code (code operations, spaces and dashes allowed),
 * or something else (`invalid`: the page says so without calling the server).
 */
export type ManualEntry = { kind: 'token'; value: string } | { kind: 'code'; value: string } | { kind: 'invalid' } | { kind: 'empty' };

export function readManual(raw: string): ManualEntry {
	const token = cleanToken(raw);
	if (!token) return { kind: 'empty' };
	if (QR_TOKEN.test(token)) return { kind: 'token', value: token };
	if (isTicketCode(raw)) return { kind: 'code', value: normalizeTicketCode(raw) };
	return { kind: 'invalid' };
}

export interface ScanEntry {
	id: number;
	outcome: ScanOutcome;
	at: number;
	buyer?: string;
	place?: string;
	code?: string;
}

/** "Block A, row 3, seat 7" in the viewer's language comes from the caller; this returns the three parts. */
export interface SeatLike {
	sectionKey: string;
	row: number;
	number: number;
}
