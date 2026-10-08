import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Button } from '@mui/material';
import { formatEventDate, formatPrice } from '../../format';
import { SaleState } from '../../events';
import { seatsUrl } from '../../routes';
import { EventItem, TicketTypeItem } from '../../types/event';

const LOW_STOCK = 10;

type Availability = 'available' | 'soldOut' | 'paused' | 'notStarted' | 'closed';

const availabilityOf = (tt: TicketTypeItem): Availability => {
	const now = Date.now();
	if (tt.ticketTypeStatus === 'SOLD_OUT' || tt.soldQuantity >= tt.totalQuantity) return 'soldOut';
	if (tt.ticketTypeStatus === 'PAUSED') return 'paused';
	if (tt.saleStartAt && new Date(tt.saleStartAt).getTime() > now) return 'notStarted';
	if (tt.saleEndAt && new Date(tt.saleEndAt).getTime() <= now) return 'closed';
	return 'available';
};

interface Props {
	event: EventItem;
	ticketTypes: TicketTypeItem[];
	loading: boolean;
	state: SaleState;
}

/** Ticket types with prices and availability, and the one primary action: go to seat / ticket selection. */
const TicketPanel = ({ event, ticketTypes, loading, state }: Props) => {
	const { t } = useTranslation('events');
	const { locale } = useRouter();
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

			{canBuy ? (
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
