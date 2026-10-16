/**
 * The ticket code printed under the QR code: 20 hex characters (backend decision #116).
 * The backend accepts it with spaces, dashes and lower case; this file does the same cleaning, so the browser and the server agree.
 */
const CODE_LENGTH = 20;
const CODE_PATTERN = /^[0-9A-F]{20}$/;

/** Spaces, dashes and case removed: what is sent to the server and copied. */
export const normalizeTicketCode = (value: string): string => value.replace(/[\s-]+/g, '').toUpperCase();

export const isTicketCode = (value: string): boolean => CODE_PATTERN.test(normalizeTicketCode(value));

/** "A3F912BC..." shown as "A3F9 12BC ..." (groups of 4). A value that is not a full code is returned as it is. */
export const formatTicketCode = (code: string): string => {
	const plain = normalizeTicketCode(code);
	return plain.length === CODE_LENGTH && CODE_PATTERN.test(plain) ? (plain.match(/.{4}/g) ?? [plain]).join(' ') : code;
};

/** The text a screen reader reads: each character on its own, groups apart ("A 3 F 9, 1 2 B C, ..."), instead of a 20-character word. */
export const spokenTicketCode = (code: string): string =>
	formatTicketCode(code)
		.split(' ')
		.map((group) => group.split('').join(' '))
		.join(', ');
