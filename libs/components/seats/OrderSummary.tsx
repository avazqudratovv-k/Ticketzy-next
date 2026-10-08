import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { CalendarBlank, MapPin } from 'phosphor-react';
import { formatEventWhen, formatPrice } from '../../format';
import { localizedEvent } from '../../events';
import { EventItem } from '../../types/event';
import { OrderData } from '../../seats/types';
import EventImage from '../events/EventImage';

export interface SeatLine {
	key: string;
	title: string;
	meta: string;
	price: number;
}

interface Props {
	order: OrderData;
	event?: EventItem;
	seatLines: SeatLine[];
	/** Name of a ticket type by id, for the quantity lines */
	ticketName: (id: string) => string;
}

/** Event, seats and quantities of an order (checkout and confirmation). */
const OrderSummary = ({ order, event, seatLines, ticketName }: Props) => {
	const { t } = useTranslation('checkout');
	const { locale } = useRouter();
	const source = event ?? (order.eventData as unknown as EventItem | undefined);
	const title = source ? localizedEvent({ ...source, eventDesc: null, eventTranslations: (source.eventTranslations ?? []) as EventItem['eventTranslations'] }, locale).title : '';
	const venue = event?.venueData;
	const currency = order.currency ?? 'KRW';

	return (
		<section className="card" aria-labelledby="order-summary">
			<h2 id="order-summary" className="card__title">
				{t('order.summary')}
			</h2>
			<div className="order__event">
				<EventImage src={source?.eventImages?.[0]} className="order__image" />
				<div>
					<h3 className="order__name">{title}</h3>
					{source && (
						<p className="order__meta">
							<CalendarBlank size={16} aria-hidden="true" /> {formatEventWhen(source.startAt, source.endAt, locale, venue?.venueTimezone, true)}
						</p>
					)}
					{venue && (
						<p className="order__meta">
							<MapPin size={16} aria-hidden="true" /> {venue.venueName}, {venue.venueCity}
						</p>
					)}
				</div>
			</div>
			{seatLines.length > 0 ? (
				<ul className="order__lines">
					{seatLines.map((line) => (
						<li key={line.key}>
							<div>
								<span className="order__line-title">{line.title}</span>
								<span className="order__line-meta">{line.meta}</span>
							</div>
							<span>{formatPrice(line.price, locale, currency)}</span>
						</li>
					))}
				</ul>
			) : (
				<ul className="order__lines">
					{order.items.map((item) => (
						<li key={item.ticketTypeId}>
							<div>
								<span className="order__line-title">
									{item.quantity} × {ticketName(item.ticketTypeId)}
								</span>
								<span className="order__line-meta">{order.seatIds.length > 0 ? t('order.seated') : t('order.general')}</span>
							</div>
							<span>{formatPrice(item.quantity * item.unitPrice, locale, currency)}</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
};

export default OrderSummary;
