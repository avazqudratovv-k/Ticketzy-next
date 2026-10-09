import { formatEventDate } from './format';
import { EventStatus } from './types/event';

/** Backend text: "This venue is already booked for {title} from 2031-01-01 19:00 to 2031-01-01 21:00." (venue time zone). */
const BOOKED = /^This venue is already booked for ([\s\S]+) from (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) to (\d{4}-\d{2}-\d{2} \d{2}:\d{2})\.?$/;

export interface VenueBooked {
	title: string;
	start: string;
	end: string;
}

export const parseVenueBooked = (message: string): VenueBooked | null => {
	const match = BOOKED.exec(message.trim());
	return match ? { title: match[1], start: match[2], end: match[3] } : null;
};

/** "2031-01-01 19:00" is already the venue's wall clock; format it as that clock (UTC is only the carrier, no zone shift). */
export const formatVenueClock = (stamp: string, locale?: string): string => {
	const iso = `${stamp.replace(' ', 'T')}:00Z`;
	return Number.isNaN(new Date(iso).getTime()) ? stamp : formatEventDate(iso, locale, 'UTC', true);
};

export const bookedParams = (booked: VenueBooked, locale?: string) => ({
	title: booked.title,
	start: formatVenueClock(booked.start, locale),
	end: formatVenueClock(booked.end, locale),
});

/** Admin-only `Event.possibleVenueConflicts` item. `null` on the event means "not checked", `[]` "checked, none". */
export interface VenueConflict {
	eventId: string;
	eventTitle: string;
	eventStatus: Extract<EventStatus, 'PENDING' | 'APPROVED' | 'ENDED'>;
	organizerNick?: string | null;
	venueName: string;
	startAt: string;
	endAt: string;
}
