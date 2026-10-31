import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { ArrowUUpLeft, CalendarBlank, Prohibit } from 'phosphor-react';
import { formatEventWhen, formatPrice, formatViewerDate } from '../../format';
import { localizedEvent } from '../../events';
import { getRefundState } from '../../refundPolicy';
import { formatRefundDeadline } from '../../refundText';
import { orderUrl } from '../../routes';
import { AccountOrder } from '../../types/account';
import { EventItem } from '../../types/event';
import { OrderBadge } from './StatusBadge';

export const eventTitleOf = (event: AccountOrder['eventData'], locale?: string) =>
	event ? localizedEvent({ eventTitle: event.eventTitle, eventDesc: null, eventTranslations: event.eventTranslations as EventItem['eventTranslations'] }, locale).title : '';

/** One order of the history list (design: Orders). The whole row opens the order. */
const OrderRow = ({ order }: { order: AccountOrder }) => {
	const { t } = useTranslation('account');
	const { t: te } = useTranslation('events');
	const { locale } = useRouter();
	const event = order.eventData;
	const venue = event?.venueData;
	// Only a paid (or refunded) order was bought; the others were only ordered (F375)
	const paid = order.orderStatus === 'PAID' || order.orderStatus === 'REFUNDED';
	const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
	// Whether a paid order can still be refunded, from the policy it was bought under (the order page asks the server)
	const refund =
		order.orderStatus === 'PAID' && event && event.eventStatus !== 'CANCELLED' && new Date(event.endAt).getTime() > Date.now()
			? getRefundState(order, event.startAt, venue?.venueTimezone ?? 'Asia/Seoul')
			: null;

	return (
		<li className="orow">
			<div className="orow__event">
				<Link href={orderUrl(order._id)} className="orow__title">
					{eventTitleOf(event, locale) || t('order.unknownEvent')}
				</Link>
				<code className="orow__code">{order.orderNumber}</code>
				{event && (
					<span className="orow__when">
						<CalendarBlank size={16} aria-hidden="true" /> {formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone)}
					</span>
				)}
			</div>
			<dl className="orow__facts">
				<div>
					<dt>{t('order.tickets')}</dt>
					<dd>{t('order.ticketCount', { count })}</dd>
				</div>
				<div>
					<dt>{t(paid ? 'order.bought' : 'order.ordered')}</dt>
					<dd>{formatViewerDate(order.createdAt, locale)}</dd>
				</div>
				<div>
					<dt>{t('order.total')}</dt>
					<dd>{formatPrice(order.totalAmount, locale, order.currency ?? 'KRW')}</dd>
				</div>
			</dl>
			<div className="orow__side">
				<OrderBadge status={order.orderStatus} />
				{refund && (
					<span className={`orow__refund orow__refund--${refund.kind.toLowerCase()}`} data-refund={refund.kind}>
						{refund.kind === 'OPEN' ? <ArrowUUpLeft size={16} aria-hidden="true" /> : <Prohibit size={16} aria-hidden="true" />}
						{refund.kind === 'OPEN'
							? te('refund.refundable', { date: formatRefundDeadline(refund.deadline, locale, venue?.venueTimezone) })
							: refund.kind === 'CLOSED'
							? te('refund.windowClosed')
							: te('refund.nonRefundable')}
					</span>
				)}
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
