import { useMemo } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CalendarBlank, CaretLeft, MapPin, Ticket } from 'phosphor-react';
import { GET_MY_TICKETS_LIST, GET_ORDER_DETAIL, GET_TICKET_TYPES } from '../../../apollo/user/query';
import withLayoutBasic from '../../../libs/components/layout/LayoutBasic';
import { withAccount } from '../../../libs/components/account/AccountShell';
import LoadError from '../../../libs/components/account/LoadError';
import RefundPanel from '../../../libs/components/account/RefundPanel';
import { eventTitleOf } from '../../../libs/components/account/OrderRow';
import { OrderBadge, TicketBadge } from '../../../libs/components/account/StatusBadge';
import EventImage from '../../../libs/components/events/EventImage';
import Seo from '../../../libs/components/common/Seo';
import { ticketState } from '../../../libs/account/tickets';
import { isPublicEvent } from '../../../libs/events';
import { useSectionNames } from '../../../libs/hooks/useSectionNames';
import { seatLabel, SectionNames } from '../../../libs/seats/label';
import { formatEventWhen, formatPrice, formatViewerDate } from '../../../libs/format';
import { checkoutUrl, eventUrl, ROUTES, ticketUrl } from '../../../libs/routes';
import { AccountOrder, AccountTicket } from '../../../libs/types/account';
import { TicketTypeItem } from '../../../libs/types/event';
import { GetOrderDetailData, GetOrderVars } from '../../../libs/types/queries';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout', 'account'])) },
});

const Seat = ({ ticket, names }: { ticket: AccountTicket; names: SectionNames }) => {
	const { t } = useTranslation('account');
	const seat = ticket.seatData;
	return <>{seat ? seatLabel(t, seat, names) : t('ticket.general')}</>;
};

const OrderDetail: NextPage = () => {
	const { t } = useTranslation('account');
	const router = useRouter();
	const { locale } = router;
	const orderId = typeof router.query.orderId === 'string' ? router.query.orderId : '';
	const skip = !router.isReady || !orderId;

	const { data, error, refetch } = useQuery<GetOrderDetailData, GetOrderVars>(GET_ORDER_DETAIL, { variables: { orderId }, skip, fetchPolicy: 'cache-and-network' });
	const order: AccountOrder | undefined = data?.getOrder;
	const paidLike = order?.orderStatus === 'PAID' || order?.orderStatus === 'REFUNDED';
	// There is no filter by order: read the buyer's tickets and keep this order's
	const { data: ticketData } = useQuery(GET_MY_TICKETS_LIST, {
		variables: { input: { page: 1, limit: 100 } },
		skip: !paidLike,
		fetchPolicy: 'cache-and-network',
	});
	const live = isPublicEvent(order?.eventData);
	const { data: typeData } = useQuery(GET_TICKET_TYPES, { variables: { eventId: order?.eventId ?? '' }, skip: !order || !live, errorPolicy: 'ignore' });

	const tickets: AccountTicket[] = useMemo(
		() => ((ticketData?.getMyTickets?.list ?? []) as AccountTicket[]).filter((ticket) => ticket.orderId === orderId),
		[ticketData, orderId],
	);
	const event = order?.eventData ?? undefined;
	const sectionNames = useSectionNames(order?.eventId, paidLike && order?.seatIds.length !== 0 && live);
	const venue = event?.venueData;
	// A live event names its types; otherwise the buyer's own tickets carry the name (F355)
	const typeName = (id: string) =>
		((typeData?.getTicketTypes ?? []) as TicketTypeItem[]).find((type) => type._id === id)?.ticketTypeName ??
		tickets.find((ticket) => ticket.ticketTypeId === id)?.ticketTypeData?.ticketTypeName ??
		t('ticket.type');

	if (error && !order) {
		return (
			<LoadError
				error={error}
				onRetry={() => refetch()}
				notFoundTitle={t('order.notFound')}
				notFoundText={t('order.notFoundText')}
				back={
					<Button component={Link} href={ROUTES.orders} variant="outlined">
						{t('order.back')}
					</Button>
				}
			/>
		);
	}
	if (!order) {
		return (
			<div aria-busy="true">
				<span className="tz-skel tz-skel--title" style={{ width: '50%', height: 40 }} />
				<span className="tz-skel tz-skel--block" style={{ height: 220, marginTop: 24 }} />
			</div>
		);
	}

	const currency = order.currency ?? 'KRW';
	const title = eventTitleOf(event, locale) || t('order.unknownEvent');
	const paymentLine =
		order.orderStatus === 'PAID' && order.paidAt
			? t('order.payment.PAID', { date: formatViewerDate(order.paidAt, locale, true) })
			: order.orderStatus === 'REFUNDED' && order.refundedAt
			? t('order.payment.REFUNDED', { date: formatViewerDate(order.refundedAt, locale, true) })
			: t(`order.payment.${order.orderStatus}`, { date: '' });

	return (
		<>
			<Seo title={t('order.detailTitle', { number: order.orderNumber })} noindex />
			<Link href={ROUTES.orders} className="acct__back tz-link">
				<CaretLeft size={16} aria-hidden="true" /> {t('order.back')}
			</Link>
			<div className="acct__head">
				<div>
					<h1 className="acct__title">{title}</h1>
					<p className="acct__sub">
						{t('order.number')} <code className="confirm__code">{order.orderNumber}</code> · {t(paidLike ? 'order.boughtOn' : 'order.orderedOn', { date: formatViewerDate(order.createdAt, locale) })}
					</p>
				</div>
				<OrderBadge status={order.orderStatus} />
			</div>

			<div className="acct__cols">
				<div className="acct__stack">
					<section className="card" aria-labelledby="order-event">
						<h2 id="order-event" className="card__title">
							{t('order.event')}
						</h2>
						<div className="order__event">
							<EventImage src={event?.eventImages?.[0]} className="order__image" sizes="160px" />
							<div>
								<h3 className="order__name">
									{event ? (
										<Link href={eventUrl(event._id)} className="tz-link">
											{title}
										</Link>
									) : (
										title
									)}
								</h3>
								{event && (
									<p className="order__meta">
										<CalendarBlank size={16} aria-hidden="true" /> {formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone, true)}
									</p>
								)}
								{venue && (
									<p className="order__meta">
										<MapPin size={16} aria-hidden="true" /> {venue.venueName}, {venue.venueCity}
									</p>
								)}
							</div>
						</div>
					</section>

					<section className="card" aria-labelledby="order-items">
						<h2 id="order-items" className="card__title">
							{t('order.items')}
						</h2>
						<ul className="order__lines">
							{tickets.length > 0
								? tickets.map((ticket) => (
										<li key={ticket._id}>
											<div>
												<span className="order__line-title">
													<Link href={ticketUrl(ticket._id)} className="tz-link">
														{ticket.ticketTypeData?.ticketTypeName ?? typeName(ticket.ticketTypeId)}
													</Link>
												</span>
												<span className="order__line-meta">
													<Seat ticket={ticket} names={sectionNames} />
												</span>
											</div>
											<div className="order__line-end">
												<TicketBadge state={ticketState(ticket)} />
												<span>{formatPrice(ticket.ticketTypeData?.ticketPrice ?? 0, locale, ticket.ticketTypeData?.ticketCurrency ?? currency)}</span>
											</div>
										</li>
								  ))
								: order.items.map((item) => (
										<li key={item.ticketTypeId}>
											<div>
												<span className="order__line-title">
													{item.quantity} × {typeName(item.ticketTypeId)}
												</span>
												<span className="order__line-meta">{order.seatIds.length > 0 ? t('ticket.seated') : t('ticket.general')}</span>
											</div>
											<span>{formatPrice(item.quantity * item.unitPrice, locale, currency)}</span>
										</li>
								  ))}
						</ul>
						<dl className="breakdown">
							<div className="breakdown__row breakdown__row--total">
								<dt>{t('order.total')}</dt>
								<dd>{formatPrice(order.totalAmount, locale, currency)}</dd>
							</div>
						</dl>
						<p className="breakdown__note">{paymentLine}</p>
						{paidLike && tickets.length > 0 && (
							<div>
								<Button component={Link} href={ticketUrl(tickets[0]._id)} variant="outlined" startIcon={<Ticket size={20} aria-hidden="true" />}>
									{t('order.viewTickets')}
								</Button>
							</div>
						)}
						{order.orderStatus === 'PENDING_PAYMENT' && new Date(order.expiresAt).getTime() > Date.now() && (
							<div>
								<Button component={Link} href={checkoutUrl(order._id)} variant="contained">
									{t('order.continuePay')}
								</Button>
							</div>
						)}
					</section>
				</div>
				<div className="acct__stack acct__stack--sticky">
					<RefundPanel order={order} />
				</div>
			</div>
		</>
	);
};

export default withLayoutBasic(withAccount(OrderDetail));
