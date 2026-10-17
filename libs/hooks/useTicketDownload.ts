import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ApolloClient, useApolloClient } from '@apollo/client';
import { useTranslation } from 'next-i18next';
import { GET_EVENT_SEAT_MAP, GET_MY_TICKETS_LIST } from '../../apollo/user/query';
import { eventTitleOf } from '../components/account/OrderRow';
import { displayName } from '../components/common/Avatar';
import { downloadTicketsPdf, PdfTicket, slug, ticketFileName } from '../account/ticketPdf';
import { ticketState } from '../account/tickets';
import { isPublicEvent } from '../events';
import { formatEventWhen, formatZoneName } from '../format';
import { MAX_PAGE_SIZE } from './usePagedQuery';
import useAuth from './useAuth';
import { sectionNamesOf, seatLabel, SectionNames } from '../seats/label';
import { AccountTicket } from '../types/account';

/** Most tickets one "Download all" file holds; a PDF of this many pages is already several MB. */
const MAX_TICKETS = 300;

export type DownloadStatus = { kind: 'ok'; count: number } | { kind: 'none' } | { kind: 'error' } | null;

/** A ticket the PDF can carry: still valid, event not over, and the server sent its QR token. */
export const isDownloadable = (ticket: AccountTicket): boolean => ticketState(ticket) === 'valid' && Boolean(ticket.qrToken);

/** Every unused ticket of an upcoming event, in pages of 100. */
export async function fetchUpcomingTickets(client: ApolloClient<unknown>): Promise<AccountTicket[]> {
	const found: AccountTicket[] = [];
	for (let page = 1; found.length < MAX_TICKETS; page++) {
		const { data } = await client.query({ query: GET_MY_TICKETS_LIST, variables: { input: { page, limit: MAX_PAGE_SIZE, timeFilter: 'UPCOMING' } }, fetchPolicy: 'network-only' });
		const block = data?.getMyTickets;
		const list = (block?.list ?? []) as AccountTicket[];
		found.push(...list.filter(isDownloadable));
		if (list.length === 0 || page * MAX_PAGE_SIZE >= (block?.metaCounter?.[0]?.total ?? 0)) break;
	}
	return found.slice(0, MAX_TICKETS);
}

/**
 * Builds and saves the PDF of one ticket or of every unused upcoming ticket (F363). Section names for reserved seats come from
 * the seat map layout (cache-first, one request per event); if that fails the seat reads "Row 7, seat 12".
 */
export default function useTicketDownload() {
	const { t } = useTranslation('account');
	const { locale } = useRouter();
	const client = useApolloClient();
	const { user } = useAuth();
	const [busy, setBusy] = useState(false);
	const [status, setStatus] = useState<DownloadStatus>(null);
	const running = useRef(false);

	const sectionNamesFor = useCallback(
		async (tickets: AccountTicket[]): Promise<Map<string, SectionNames>> => {
			const events = Array.from(new Set(tickets.filter((ticket) => ticket.seatData && isPublicEvent(ticket.eventData)).map((ticket) => ticket.eventId)));
			const names = new Map<string, SectionNames>();
			await Promise.all(
				events.map(async (eventId) => {
					try {
						const { data } = await client.query({ query: GET_EVENT_SEAT_MAP, variables: { eventId }, fetchPolicy: 'cache-first', errorPolicy: 'ignore' });
						names.set(eventId, sectionNamesOf(data?.getEventSeatMap?.venueLayout?.sections));
					} catch {
						/* the label then leaves the section out */
					}
				}),
			);
			return names;
		},
		[client],
	);

	const build = useCallback(
		async (tickets: AccountTicket[], fileName?: string) => {
			const names = await sectionNamesFor(tickets);
			const buyer = user ? displayName(user) : '';
			const items: PdfTicket[] = tickets.map((ticket) => {
				const event = ticket.eventData;
				const venue = event?.venueData;
				const zone = event ? formatZoneName(event.startAt, locale, venue?.venueTimezone) : '';
				const seat = ticket.seatData ? seatLabel(t, ticket.seatData, names.get(ticket.eventId)) : String(t('ticket.general'));
				return {
					title: eventTitleOf(event, locale) || String(t('order.unknownEvent')),
					when: event ? `${formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone, true)} (${zone})` : '',
					venue: venue ? [venue.venueName, venue.venueAddress, venue.venueCity].filter(Boolean).join(', ') : '',
					kind: [ticket.ticketTypeData?.ticketTypeName, seat].filter(Boolean).join(' · '),
					buyer,
					qrToken: ticket.qrToken as string,
					code: ticket.ticketCode,
				};
			});
			const labels = {
				date: String(t('ticket.pdf.date')),
				venue: String(t('ticket.pdf.venue')),
				ticket: String(t('ticket.pdf.ticket')),
				buyer: String(t('ticket.pdf.buyer')),
				code: String(t('ticket.pdf.code')),
				hint: String(t('ticket.pdf.hint')),
			};
			const name =
				fileName ??
				(items.length === 1
					? ticketFileName(items[0].title, items[0].code)
					: new Set(items.map((item) => item.title)).size === 1
					? `ticketzy-${slug(items[0].title) || 'event'}-${items.length}-tickets.pdf`
					: `ticketzy-tickets-${items.length}.pdf`);
			await downloadTicketsPdf(items, labels, name);
			return items.length;
		},
		[locale, sectionNamesFor, t, user],
	);

	const run = useCallback(async (load: () => Promise<AccountTicket[]>) => {
		if (running.current) return;
		running.current = true;
		setBusy(true);
		setStatus(null);
		try {
			const tickets = await load();
			if (tickets.length === 0) setStatus({ kind: 'none' });
			else setStatus({ kind: 'ok', count: await build(tickets) });
		} catch {
			setStatus({ kind: 'error' });
		} finally {
			running.current = false;
			setBusy(false);
		}
	}, [build]);

	return {
		busy,
		status,
		downloadOne: (ticket: AccountTicket) => run(async () => (isDownloadable(ticket) ? [ticket] : [])),
		downloadAll: () => run(() => fetchUpcomingTickets(client)),
	};
}
