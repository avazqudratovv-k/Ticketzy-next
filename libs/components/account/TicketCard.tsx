import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { CalendarBlank, MapPin, Ticket } from 'phosphor-react';
import { formatEventWhen } from '../../format';
import { ticketState } from '../../account/tickets';
import { useSectionNames } from '../../hooks/useSectionNames';
import { seatLabel } from '../../seats/label';
import { ticketUrl } from '../../routes';
import { AccountTicket } from '../../types/account';
import EventImage from '../events/EventImage';
import { eventTitleOf } from './OrderRow';
import { TicketBadge } from './StatusBadge';

/** One ticket (design: TicketCard): event, date and time in the venue's zone, venue, seat and status. */
const TicketCard = ({ ticket }: { ticket: AccountTicket }) => {
	const { t } = useTranslation('account');
	const { locale } = useRouter();
	const event = ticket.eventData;
	const venue = event?.venueData;
	const state = ticketState(ticket);
	const seat = ticket.seatData;
	const sectionNames = useSectionNames(ticket.eventId, Boolean(seat));

	return (
		<li className="tcard">
			<Link href={ticketUrl(ticket._id)} className="tcard__image" tabIndex={-1} aria-hidden="true">
				<EventImage src={event?.eventImages?.[0]} sizes="(min-width: 768px) 240px, 120px" />
			</Link>
			<div className="tcard__body">
				<h2 className="tcard__title">
					<Link href={ticketUrl(ticket._id)}>{eventTitleOf(event, locale) || t('order.unknownEvent')}</Link>
				</h2>
				<ul className="tcard__meta">
					{event && (
						<li>
							<CalendarBlank size={16} aria-hidden="true" />
							{formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone, true)}
						</li>
					)}
					{venue && (
						<li>
							<MapPin size={16} aria-hidden="true" />
							{venue.venueName}, {venue.venueCity}
						</li>
					)}
					<li>
						<Ticket size={16} aria-hidden="true" />
						{[ticket.ticketTypeData?.ticketTypeName, seat ? seatLabel(t, seat, sectionNames) : t('ticket.general')]
							.filter(Boolean)
							.join(' · ')}
					</li>
				</ul>
				<div className="tcard__foot">
					<TicketBadge state={state} />
					<Link href={ticketUrl(ticket._id)} className="tz-link">
						{state === 'valid' ? t('ticket.showQr') : t('ticket.open')}
					</Link>
				</div>
			</div>
		</li>
	);
};

export const TicketCardSkeleton = () => (
	<li className="tcard" aria-hidden="true">
		<span className="tcard__image tz-skel" />
		<div className="tcard__body">
			<span className="tz-skel tz-skel--title" style={{ width: '70%' }} />
			<span className="tz-skel tz-skel--text" style={{ width: '50%' }} />
			<span className="tz-skel tz-skel--text" style={{ width: '60%' }} />
		</div>
	</li>
);

export default TicketCard;
