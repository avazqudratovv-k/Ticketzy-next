/** A one-event iCalendar file ("Add to calendar"). Times go out in UTC, so every calendar shows the venue's local time correctly. */

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const escapeText = (value: string) =>
	value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');

/** Lines longer than 75 octets are folded with a leading space (RFC 5545 3.1). Counts bytes, not characters. */
function fold(line: string): string {
	const encoder = new TextEncoder();
	if (encoder.encode(line).length <= 75) return line;
	const parts: string[] = [];
	let current = '';
	let size = 0;
	for (const char of Array.from(line)) {
		const width = encoder.encode(char).length;
		const limit = parts.length === 0 ? 75 : 74;
		if (size + width > limit) {
			parts.push(current);
			current = '';
			size = 0;
		}
		current += char;
		size += width;
	}
	parts.push(current);
	return parts.join('\r\n ');
}

export interface IcsEvent {
	uid: string;
	title: string;
	start: string;
	end: string;
	location?: string;
	description?: string;
}

export function buildIcs(event: IcsEvent): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Ticketzy//Tickets//EN',
		'CALSCALE:GREGORIAN',
		'BEGIN:VEVENT',
		`UID:${event.uid}@ticketzy`,
		`DTSTAMP:${stamp(new Date())}`,
		`DTSTART:${stamp(new Date(event.start))}`,
		`DTEND:${stamp(new Date(event.end))}`,
		`SUMMARY:${escapeText(event.title)}`,
		...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
		...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
		'END:VEVENT',
		'END:VCALENDAR',
	];
	return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Saves the text as a file through a temporary link. */
export function downloadIcs(filename: string, content: string) {
	const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
