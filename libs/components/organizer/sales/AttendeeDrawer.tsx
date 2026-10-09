import Link from 'next/link';
import { useRouter } from 'next/router';
import { Drawer, IconButton } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { X } from 'phosphor-react';
import TicketStatusBadge from './TicketStatusBadge';
import { Attendee } from '../../../organizer/attendees';
import { formatEventDate } from '../../../format';

interface Props {
	attendee: Attendee | null;
	/** all tickets of the same order */
	tickets: Attendee[];
	onClose: () => void;
	eventId: string;
	timeZone?: string | null;
	place: (attendee: Attendee) => string;
}

/** One buyer's tickets for the event. The backend sends the buyer's name only (no email or phone), the order number and each ticket. */
const AttendeeDrawer = ({ attendee, tickets, onClose, eventId, timeZone, place }: Props) => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	return (
		<Drawer anchor="right" open={Boolean(attendee)} onClose={onClose} PaperProps={{ className: 'org-drawer', role: 'dialog', 'aria-labelledby': 'attendee-drawer-title' } as object}>
			{attendee && (
				<>
					<div className="org-drawer__head">
						<div>
							<h2 id="attendee-drawer-title">{attendee.buyerName || t('orders.unknownBuyer')}</h2>
							{attendee.orderNumber && <span className="org-mono org-hint">{attendee.orderNumber}</span>}
						</div>
						<IconButton onClick={onClose} aria-label={t('attendees.drawer.close')}>
							<X size={22} aria-hidden="true" />
						</IconButton>
					</div>
					<div className="org-drawer__body">
						<h3 className="org-drawer__sub">{t('attendees.drawer.tickets', { count: tickets.length })}</h3>
						<ul className="org-ticketlist">
							{tickets.map((ticket) => (
								<li key={ticket.ticketId} className={ticket.ticketId === attendee.ticketId ? 'is-current' : undefined}>
									<div className="org-upcoming__top">
										<strong>{ticket.ticketTypeName || t('orders.unknownType')}</strong>
										<TicketStatusBadge status={ticket.ticketStatus} />
									</div>
									<span className="org-row__meta">{place(ticket)}</span>
									<span className="org-mono org-row__meta">{ticket.ticketCode}</span>
									<span className="org-row__meta">
										{ticket.checkedInAt ? t('attendees.drawer.checkedInAt', { when: formatEventDate(ticket.checkedInAt, locale, timeZone) }) : t('attendees.notYet')}
									</span>
								</li>
							))}
						</ul>
						{attendee.orderNumber && (
							<Link href={`/organizer/events/${eventId}/orders`} className="tz-link">
								{t('attendees.drawer.openOrders')}
							</Link>
						)}
					</div>
				</>
			)}
		</Drawer>
	);
};

export default AttendeeDrawer;
