import { parseApiError, NETWORK_ERROR } from '../errors';

/**
 * What a scan means for the person at the gate. Backend messages (libs/enums/common.enum.ts, DECISIONS #53) are matched exactly;
 * anything else is `error` and the server's words are shown.
 */
export type ScanOutcome = 'valid' | 'used' | 'wrongEvent' | 'refunded' | 'invalid' | 'notOpen' | 'notAllowed' | 'network' | 'error';

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

export function classifyScan(err: unknown): { outcome: ScanOutcome; raw: string } {
	const parsed = parseApiError(err);
	if (parsed.code === NETWORK_ERROR) return { outcome: 'network', raw: '' };
	const raw = Array.isArray(parsed.message) ? parsed.message.join(' ') : String(parsed.message ?? '');
	return { outcome: MESSAGES[raw] ?? 'error', raw };
}

/** The camera gives the QR text; a typed value may carry spaces or line breaks from a paste. */
export const cleanToken = (value: string) => value.trim().replace(/\s+/g, '');

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
