import { normalizeTicketCode } from '../ticketCode';
export type TicketStatusKey = 'VALID' | 'USED' | 'REFUNDED';
export const TICKET_STATUSES: TicketStatusKey[] = ['VALID', 'USED', 'REFUNDED'];
export const isTicketStatus = (value: unknown): value is TicketStatusKey => (TICKET_STATUSES as unknown[]).includes(value);

export const ATTENDEES_PAGE_SIZE = 10;

export interface Attendee {
	ticketId: string;
	ticketCode: string;
	ticketStatus: string;
	checkedInAt?: string | null;
	buyerName: string;
	ticketTypeName?: string | null;
	orderNumber?: string | null;
	seat?: { sectionKey: string; row: number; number: number } | null;
}

/** Search by buyer name, order number or ticket code; case and accents do not matter. */
export const matchesSearch = (attendee: Attendee, query: string) => {
	const needle = query.trim().toLocaleLowerCase();
	if (!needle) return true;
	// a code typed or pasted in groups ("A3F9 12BC") still finds the plain stored code
	const code = normalizeTicketCode(needle);
	return (
		[attendee.buyerName, attendee.orderNumber, attendee.ticketCode].some((value) => (value ?? '').toLocaleLowerCase().includes(needle)) ||
		(code.length > 0 && (attendee.ticketCode ?? '').toUpperCase().includes(code))
	);
};

/** The tickets bought in the same order as this one, in the order they were issued. */
export const sameOrder = (list: Attendee[], attendee: Attendee) =>
	attendee.orderNumber ? list.filter((item) => item.orderNumber === attendee.orderNumber) : [attendee];

/** A CSV cell: quoted, quotes doubled, and a leading =, +, - or @ is neutralised so a spreadsheet does not run a buyer-chosen name as a formula. */
export const csvCell = (value: string | number | null | undefined) => {
	let text = String(value ?? '');
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return `"${text.replace(/"/g, '""')}"`;
};

export const toCsv = (header: string[], rows: (string | number | null | undefined)[][]) =>
	// the BOM makes Excel read the file as UTF-8 (Korean, Cyrillic)
	`﻿${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;

export function downloadCsv(filename: string, content: string) {
	const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (text: string) =>
	text
		.normalize('NFKD')
		.replace(/[^a-zA-Z0-9\u00C0-\uFFFF]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase()
		.slice(0, 40) || 'event';
