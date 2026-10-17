import { normalizeTicketCode, formatTicketCode } from '../ticketCode';

/**
 * Ticket PDF (F363). One ticket per A4 page: logo, event, date and time in the venue's zone, venue, ticket or seat, buyer,
 * the QR code (black on white, 90 mm, with a quiet zone) and the ticket code in groups of 4.
 *
 * jsPDF's built-in fonts only cover Latin-1, so every line of text that can hold a Korean, Russian or Uzbek name is drawn on a
 * canvas with the browser's own fonts and placed as an image. The ticket code is ASCII and is real PDF text. Nothing is sent
 * anywhere: the PDF is built in the browser from data the ticket page already holds. jsPDF and qrcode load on first use.
 */

export interface PdfTicket {
	title: string;
	when: string;
	venue: string;
	/** ticket type and seat, already written for the buyer */
	kind: string;
	buyer: string;
	qrToken: string;
	code: string;
}

export interface PdfLabels {
	date: string;
	venue: string;
	ticket: string;
	buyer: string;
	code: string;
	hint: string;
}

const PAGE = { w: 210, h: 297 };
const MARGIN = 18;
const INNER = PAGE.w - MARGIN * 2;
const PX_PER_MM = 12;
const FONT = '"Onest", "Noto Sans KR", system-ui, -apple-system, "Segoe UI", sans-serif';
const INK = '#0a0b0d';
const MUTED = '#4a4d55';

interface Block {
	url: string;
	w: number;
	h: number;
}

/** Splits text into lines no wider than `maxPx`; a word wider than a line is cut by character (Korean has no spaces). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxPx: number, maxLines: number): string[] {
	const lines: string[] = [];
	let line = '';
	const push = () => {
		lines.push(line);
		line = '';
	};
	for (const word of text.split(/\s+/).filter(Boolean)) {
		const attempt = line ? `${line} ${word}` : word;
		if (ctx.measureText(attempt).width <= maxPx) {
			line = attempt;
			continue;
		}
		if (line) push();
		if (ctx.measureText(word).width <= maxPx) {
			line = word;
			continue;
		}
		for (const char of Array.from(word)) {
			if (line && ctx.measureText(line + char).width > maxPx) push();
			line += char;
		}
	}
	if (line) push();
	if (lines.length > maxLines) {
		const kept = lines.slice(0, maxLines);
		let last = kept[maxLines - 1];
		while (last.length > 1 && ctx.measureText(`${last}…`).width > maxPx) last = last.slice(0, -1);
		kept[maxLines - 1] = `${last}…`;
		return kept;
	}
	return lines;
}

function textBlock(text: string, options: { pt: number; weight?: number; color?: string; widthMm: number; align?: 'left' | 'center'; maxLines?: number }): Block {
	const { pt, weight = 400, color = INK, widthMm, align = 'left', maxLines = 2 } = options;
	const mmPerPt = 25.4 / 72;
	const fontPx = pt * mmPerPt * PX_PER_MM;
	const lineHeight = fontPx * 1.3;
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('canvas unavailable');
	const widthPx = Math.round(widthMm * PX_PER_MM);
	ctx.font = `${weight} ${fontPx}px ${FONT}`;
	const lines = wrap(ctx, text, widthPx, maxLines);
	canvas.width = widthPx;
	canvas.height = Math.ceil(lineHeight * Math.max(1, lines.length));
	// resizing the canvas resets its state
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.font = `${weight} ${fontPx}px ${FONT}`;
	ctx.fillStyle = color;
	ctx.textBaseline = 'middle';
	ctx.textAlign = align;
	lines.forEach((line, index) => ctx.fillText(line, align === 'center' ? widthPx / 2 : 0, lineHeight * index + lineHeight / 2));
	return { url: canvas.toDataURL('image/png'), w: widthMm, h: canvas.height / PX_PER_MM };
}

let logoPng: Promise<string | null> | null = null;
/** The favicon artwork as a PNG; null if it cannot be loaded (the page then has the word only). */
function loadLogo(): Promise<string | null> {
	logoPng ??= new Promise<string | null>((resolve) => {
		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = 256;
			canvas.height = 256;
			const ctx = canvas.getContext('2d');
			if (!ctx) return resolve(null);
			ctx.drawImage(image, 0, 0, 256, 256);
			resolve(canvas.toDataURL('image/png'));
		};
		image.onerror = () => resolve(null);
		image.src = '/favicon.svg';
	}).then((value) => {
		if (!value) logoPng = null;
		return value;
	});
	return logoPng;
}

/** File name: ticketzy-<event>-<code>.pdf, event cut to letters and digits. */
export function ticketFileName(title: string, code: string): string {
	return `ticketzy-${slug(title) || 'event'}-${normalizeTicketCode(code)}.pdf`;
}

export function slug(text: string): string {
	return text
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
		.replace(/-+$/g, '');
}

/** Builds the PDF and starts the download. Resolves with the file name. */
export async function downloadTicketsPdf(tickets: PdfTicket[], labels: PdfLabels, fileName: string): Promise<string> {
	if (tickets.length === 0) throw new Error('no tickets');
	const [{ jsPDF }, QRCode, logo] = await Promise.all([import('jspdf'), import('qrcode'), loadLogo()]);
	if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
	const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
	doc.setProperties({ title: fileName.replace(/\.pdf$/, ''), creator: 'Ticketzy' });

	for (let index = 0; index < tickets.length; index++) {
		const ticket = tickets[index];
		if (index > 0) doc.addPage('a4', 'portrait');
		let y = MARGIN;

		// Brand row
		if (logo) doc.addImage(logo, 'PNG', MARGIN, y, 14, 14);
		const brand = textBlock('Ticketzy', { pt: 22, weight: 800, widthMm: 80, maxLines: 1 });
		doc.addImage(brand.url, 'PNG', MARGIN + (logo ? 18 : 0), y + (14 - brand.h) / 2, brand.w, brand.h);
		y += 14 + 12;

		// Event name
		const title = textBlock(ticket.title, { pt: 26, weight: 800, widthMm: INNER, maxLines: 3 });
		doc.addImage(title.url, 'PNG', MARGIN, y, title.w, title.h);
		y += title.h + 8;

		// Facts
		const fact = (label: string, value: string) => {
			const l = textBlock(label.toUpperCase(), { pt: 8.5, weight: 700, color: MUTED, widthMm: INNER, maxLines: 1 });
			doc.addImage(l.url, 'PNG', MARGIN, y, l.w, l.h);
			y += l.h + 0.5;
			const v = textBlock(value, { pt: 13, weight: 600, widthMm: INNER, maxLines: 2 });
			doc.addImage(v.url, 'PNG', MARGIN, y, v.w, v.h);
			y += v.h + 5;
		};
		if (ticket.when) fact(labels.date, ticket.when);
		if (ticket.venue) fact(labels.venue, ticket.venue);
		if (ticket.kind) fact(labels.ticket, ticket.kind);
		if (ticket.buyer) fact(labels.buyer, ticket.buyer);

		// Tear line with the two notches of the ticket
		y += 2;
		doc.setDrawColor(150, 152, 160);
		doc.setLineWidth(0.3);
		doc.setLineDashPattern([2, 2], 0);
		doc.line(MARGIN + 4, y, PAGE.w - MARGIN - 4, y);
		doc.setLineDashPattern([], 0);
		y += 8;

		// QR: black on white, a quiet zone of 2 modules inside the image, 90 mm
		const qr = await QRCode.toDataURL(ticket.qrToken, { errorCorrectionLevel: 'M', margin: 2, width: 900, color: { dark: '#000000', light: '#ffffff' } });
		const size = 90;
		doc.addImage(qr, 'PNG', (PAGE.w - size) / 2, y, size, size);
		y += size + 7;

		// Code in groups of 4, real text
		const code = textBlock(labels.code.toUpperCase(), { pt: 8.5, weight: 700, color: MUTED, widthMm: INNER, align: 'center', maxLines: 1 });
		doc.addImage(code.url, 'PNG', MARGIN, y, code.w, code.h);
		y += code.h + 2;
		doc.setFont('courier', 'bold');
		doc.setFontSize(21);
		doc.setTextColor(10, 11, 13);
		doc.text(formatTicketCode(ticket.code), PAGE.w / 2, y + 6, { align: 'center' });
		y += 14;

		const hint = textBlock(labels.hint, { pt: 9.5, color: MUTED, widthMm: INNER - 20, align: 'center', maxLines: 3 });
		doc.addImage(hint.url, 'PNG', MARGIN + 10, Math.min(y, PAGE.h - MARGIN - hint.h), hint.w, hint.h);
	}

	doc.save(fileName);
	return fileName;
}
