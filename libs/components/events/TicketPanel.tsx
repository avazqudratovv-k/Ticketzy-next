import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Button } from '@mui/material';
import { formatEventDate, formatPrice } from '../../format';
import { SaleState, ticketAvailability as availabilityOf } from '../../events';
import { seatsUrl } from '../../routes';
import { isBlockedBuyer } from '../../buyerGate';
import useAuth from '../../hooks/useAuth';
import useBuyerNotice from '../../hooks/useBuyerNotice';
import { EventItem, TicketTypeItem } from '../../types/event';

const LOW_STOCK = 10;

interface Props {
	event: EventItem;
	ticketTypes: TicketTypeItem[];
	loading: boolean;
	state: SaleState;
}

/** Ticket types with prices and availability, and the one primary action: go to seat / ticket selection. */
const TicketPanel = ({ event, ticketTypes, loading, state }: Props) => {
	const { t } = useTranslation('events');
	const { t: tc } = useTranslation('common');
	const { locale } = useRouter();
	const { user } = useAuth();
	const buyButton = useRef<HTMLButtonElement>(null);
	// Organizer and admin accounts cannot buy: the button stays (focusable, aria-disabled) and explains itself on click
	const blocked = isBlockedBuyer(user);
	const notice = useBuyerNotice(buyButton, true);
	const zone = event.venueData?.venueTimezone;
	const canBuy = state === 'onSale';
	const reserved = event.seatingType === 'RESERVED';

	return (
		<aside className="tickets" aria-labelledby="tickets-title">
			<h2 id="tickets-title">{t('detail.tickets')}</h2>
			{loading && ticketTypes.length === 0 && (
				<div aria-hidden="true">
					<span className="tz-skel tz-skel--block" />
					<span className="tz-skel tz-skel--block" />
				</div>
			)}
			<ul className="tickets__list">
				{ticketTypes.map((tt) => {
					const availability = availabilityOf(tt);
					const left = tt.totalQuantity - tt.soldQuantity;
					const disabled = availability !== 'available' || state === 'cancelled' || state === 'ended';
					return (
						<li key={tt._id} className={`tickets__item${disabled ? ' is-disabled' : ''}`}>
							<div>
								<span className="tickets__name">{tt.ticketTypeName}</span>
								<span className="tickets__note">
									{availability === 'available' && left <= LOW_STOCK && t('detail.left', { count: left })}
									{availability === 'notStarted' &&
										tt.saleStartAt &&
										t('detail.salesStart', { date: formatEventDate(tt.saleStartAt, locale, zone) })}
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

			{canBuy && blocked ? (
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
