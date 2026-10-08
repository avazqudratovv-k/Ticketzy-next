import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { CalendarBlank } from 'phosphor-react';
import { formatEventDate, formatPrice, formatViewerDate } from '../../format';
import { localizedEvent } from '../../events';
import { orderUrl } from '../../routes';
import { AccountOrder } from '../../types/account';
import { EventItem } from '../../types/event';
import { OrderBadge } from './StatusBadge';

export const eventTitleOf = (event: AccountOrder['eventData'], locale?: string) =>
	event ? localizedEvent({ eventTitle: event.eventTitle, eventDesc: null, eventTranslations: event.eventTranslations as EventItem['eventTranslations'] }, locale).title : '';

/** One order of the history list (design: Orders). The whole row opens the order. */
const OrderRow = ({ order }: { order: AccountOrder }) => {
	const { t } = useTranslation('account');
	const { locale } = useRouter();
	const event = order.eventData;
	const venue = event?.venueData;
	const count = order.items.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<li className="orow">
			<div className="orow__event">
				<Link href={orderUrl(order._id)} className="orow__title">
					{eventTitleOf(event, locale) || t('order.unknownEvent')}
				</Link>
				<code className="orow__code">{order.orderNumber}</code>
				{event && (
					<span className="orow__when">
						<CalendarBlank size={16} aria-hidden="true" /> {formatEventDate(event.startAt, locale, venue?.venueTimezone)}
					</span>
				)}
			</div>
			<dl className="orow__facts">
				<div>
					<dt>{t('order.tickets')}</dt>
					<dd>{t('order.ticketCount', { count })}</dd>
				</div>
				<div>
					<dt>{t('order.bought')}</dt>
					<dd>{formatViewerDate(order.createdAt, locale)}</dd>
				</div>
				<div>
					<dt>{t('order.total')}</dt>
					<dd>{formatPrice(order.totalAmount, locale, order.currency ?? 'KRW')}</dd>
				</div>
			</dl>
			<div className="orow__side">
				<OrderBadge status={order.orderStatus} />
				<Link href={orderUrl(order._id)} className="tz-link">
					{t('order.view')}
				</Link>
			</div>
		</li>
	);
};

export const OrderRowSkeleton = () => (
	<li className="orow" aria-hidden="true">
		<div className="orow__event">
			<span className="tz-skel tz-skel--title" style={{ width: '60%' }} />
			<span className="tz-skel tz-skel--text" style={{ width: '40%' }} />
		</div>
		<span className="tz-skel tz-skel--text" style={{ width: '70%' }} />
		<span className="tz-skel tz-skel--pill" style={{ width: 90 }} />
	</li>
);

export default OrderRow;
