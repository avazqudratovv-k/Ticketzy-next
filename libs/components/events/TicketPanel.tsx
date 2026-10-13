import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Button } from '@mui/material';
import { formatEventDate, formatPrice, formatSalesMoment } from '../../format';
import { SaleState, ticketAvailability as availabilityOf } from '../../events';
import { seatsUrl } from '../../routes';
import { isBlockedBuyer } from '../../buyerGate';
import { salesInfo, typeWindow } from '../../salesWindow';
import SalesNotice from './SalesNotice';
import { TICKET_BOX_ID } from './TicketBar';
import useAuth from '../../hooks/useAuth';
import useBuyerNotice from '../../hooks/useBuyerNotice';
import { EventItem, TicketTypeItem } from '../../types/event';

const LOW_STOCK = 10;

interface Props {
	event: EventItem;
	ticketTypes: TicketTypeItem[];
	loading: boolean;
	state: SaleState;
	/** server time from `useSalesClock` (the page owns the one timer) */
	now: number;
}

/** Ticket types with prices and availability, and the one primary action: go to seat / ticket selection. */
const TicketPanel = ({ event, ticketTypes, loading, state, now }: Props) => {
	const { t } = useTranslation('events');
	const { t: tc } = useTranslation('common');
	const { locale } = useRouter();
	const { user } = useAuth();
	const buyButton = useRef<HTMLButtonElement>(null);
	// Organizer and admin accounts cannot buy: the button stays (focusable, aria-disabled) and explains itself on click
	const blocked = isBlockedBuyer(user);
	const notice = useBuyerNotice(buyButton, true);
	// Sales not started: the same pattern, the button stays (dimmed, focusable) and a click explains
	const soon = useBuyerNotice(buyButton);
	const sales = salesInfo(event, ticketTypes, now);
	const zone = event.venueData?.venueTimezone;
	const canBuy = state === 'onSale';
	const notStarted = state === 'notStarted' && sales.at !== null;
	const reserved = event.seatingType === 'RESERVED';

	return (
		<aside id={TICKET_BOX_ID} className="tickets" aria-labelledby="tickets-title">
			<h2 id="tickets-title" tabIndex={-1}>
				{t('detail.tickets')}
			</h2>
			<SalesNotice event={event} ticketTypes={ticketTypes} now={now} compact />
			{loading && ticketTypes.length === 0 && (
				<div aria-hidden="true">
					<span className="tz-skel tz-skel--block" />
					<span className="tz-skel tz-skel--block" />
				</div>
			)}
			<ul className="tickets__list">
				{ticketTypes.map((tt) => {
					const availability = availabilityOf(tt, now, event);
					const left = tt.totalQuantity - tt.soldQuantity;
					const disabled = availability !== 'available' || state === 'cancelled' || state === 'ended';
					return (
						<li key={tt._id} className={`tickets__item${disabled ? ' is-disabled' : ''}`}>
							<div>
								<span className="tickets__name">{tt.ticketTypeName}</span>
								<span className="tickets__note">
									{availability === 'available' && left <= LOW_STOCK && t('detail.left', { count: left })}
									{availability === 'notStarted' &&
										typeWindow(event, tt).start !== null &&
										t('detail.salesStart', { date: formatEventDate(new Date(typeWindow(event, tt).start as number).toISOString(), locale, zone) })}
									{availability === 'closed' && t('detail.salesClosed')}
									{availability === 'paused' && t('detail.paused')}
								</span>
							</div>
							<div className="tickets__price">
								<span className={availability === 'soldOut' ? 'is-struck' : undefined}>
									{formatPrice(tt.ticketPrice, locale, tt.ticketCurrency)}
								</span>
								{availability === 'soldOut' && (
									<span className="tz-badge tz-badge--neutral">{t('detail.soldOutBadge')}</span>
								)}
							</div>
						</li>
					);
				})}
			</ul>
			{!loading && ticketTypes.length === 0 && <p className="tickets__none">{t('detail.noTickets')}</p>}

			{notStarted ? (
				<>
					<Button
						ref={buyButton}
						variant="contained"
						size="large"
						fullWidth
						className="tickets__buy is-blocked"
						aria-disabled="true"
						aria-describedby="sales-soon-note"
						onClick={() => {
							soon.show();
							if (blocked) notice.show();
						}}
					>
						{reserved ? t('detail.selectSeats') : t('detail.selectTickets')}
					</Button>
					<div id="sales-soon-note" role="status" className="tickets__note-live">
						{soon.visible && sales.at && <p className="tickets__blocked">{t('sales.notYet', formatSalesMoment(sales.at, locale, zone))}</p>}
						{blocked && notice.visible && <p className="tickets__blocked">{tc('buyerOnly.message')}</p>}
					</div>
				</>
			) : canBuy && blocked ? (
				<>
					<Button
						ref={buyButton}
						variant="contained"
						size="large"
						fullWidth
						className="tickets__buy is-blocked"
						aria-disabled="true"
						aria-describedby="buyer-only-note"
						onClick={notice.show}
					>
						{reserved ? t('detail.selectSeats') : t('detail.selectTickets')}
					</Button>
					<div id="buyer-only-note" role="status" className="tickets__note-live">
						{notice.visible && (
							<p className="tickets__blocked">
								{tc('buyerOnly.message')}
							</p>
						)}
					</div>
				</>
			) : canBuy ? (
				<Button component={Link} href={seatsUrl(event._id)} variant="contained" size="large" fullWidth>
					{reserved ? t('detail.selectSeats') : t('detail.selectTickets')}
				</Button>
			) : (
				<Button variant="contained" size="large" fullWidth disabled>
					{t(`detail.unavailable.${state}`)}
				</Button>
			)}
			<p className="tickets__foot">{t('detail.ticketsFoot')}</p>
		</aside>
	);
};

export default TicketPanel;
