import { useEffect, useMemo, useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, Info, Prohibit, WarningCircle } from 'phosphor-react';
import { GET_EVENT, GET_EVENT_SEAT_MAP, GET_MY_TICKETS, GET_ORDER, GET_TICKET_TYPES } from '../../../apollo/user/query';
import withLayoutBasic from '../../../libs/components/layout/LayoutBasic';
import PaidSplash from '../../../libs/components/common/PaidSplash';
import SuccessCheck from '../../../libs/components/common/SuccessCheck';
import Seo from '../../../libs/components/common/Seo';
import StateBlock from '../../../libs/components/states/StateBlock';
import OrderSummary, { SeatLine } from '../../../libs/components/seats/OrderSummary';
import Steps from '../../../libs/components/seats/Steps';
import { useRequireAuth } from '../../../libs/auth/guards';
import { formatEventDate, formatPrice } from '../../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';
import { isPublicEvent } from '../../../libs/events';
import { compareSeats } from '../../../libs/seats/layout';
import { seatParts, sectionNamesOf } from '../../../libs/seats/label';
import { LayoutSection, OrderData } from '../../../libs/seats/types';
import { checkoutUrl, ROUTES, seatsUrl } from '../../../libs/routes';
import { EventItem, TicketTypeItem } from '../../../libs/types/event';
import { GetEventData, GetEventVars, GetOrderData, GetOrderVars } from '../../../libs/types/queries';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout'])) },
});

interface TicketSeat {
	_id: string;
	ticketCode: string;
	orderId: string;
	ticketTypeId: string;
	seatData?: { sectionKey: string; row: number; number: number } | null;
	ticketTypeData?: { ticketTypeName: string; ticketPrice: number } | null;
}

const Confirmation: NextPage = () => {
	const { t } = useTranslation('checkout');
	const router = useRouter();
	const { locale } = router;
	const { allowed } = useRequireAuth();
	const orderId = typeof router.query.orderId === 'string' ? router.query.orderId : '';
	const skip = !allowed || !router.isReady || !orderId;

	const { data, error, refetch } = useQuery<GetOrderData, GetOrderVars>(GET_ORDER, { variables: { orderId }, skip, fetchPolicy: 'network-only' });
	const order: OrderData | undefined = data?.getOrder;
	const eventId = order?.eventId ?? '';
	const paid = order?.orderStatus === 'PAID';
	// The public event queries answer only for a live event (backend #121); an ended or hidden one is shown from the order and tickets (F355)
	const live = isPublicEvent(order?.eventData);
	const { data: eventData } = useQuery<GetEventData, GetEventVars>(GET_EVENT, { variables: { eventId }, skip: !eventId || !live });
	const { data: ticketTypeData } = useQuery(GET_TICKET_TYPES, { variables: { eventId }, skip: !eventId || !live, errorPolicy: 'ignore' });
	// There is no filter by order: take the buyer's tickets (past ones too, the event may be over) and keep this order's
	const { data: ticketData } = useQuery(GET_MY_TICKETS, {
		variables: { input: { page: 1, limit: 100 } },
		skip: !paid,
		fetchPolicy: 'network-only',
	});
	const reserved = (order?.seatIds.length ?? 0) > 0;
	const { data: mapData } = useQuery(GET_EVENT_SEAT_MAP, { variables: { eventId }, skip: !paid || !reserved || !live, fetchPolicy: 'cache-first', errorPolicy: 'ignore' });

	const event: EventItem | undefined = eventData?.getEvent;
	const orderTickets: TicketSeat[] = useMemo(() => (ticketData?.getMyTickets?.list ?? []).filter((ticket: TicketSeat) => ticket.orderId === orderId), [ticketData, orderId]);
	// Names and prices: the event's ticket types while it is live, else what the buyer's own tickets carry
	const ticketTypes: TicketTypeItem[] = useMemo(() => {
		const live: TicketTypeItem[] = ticketTypeData?.getTicketTypes ?? [];
		const own = orderTickets
			.filter((ticket) => ticket.ticketTypeData && !live.some((type) => type._id === ticket.ticketTypeId))
			.map((ticket) => ({ _id: ticket.ticketTypeId, ticketTypeName: ticket.ticketTypeData!.ticketTypeName, ticketPrice: ticket.ticketTypeData!.ticketPrice }) as TicketTypeItem);
		return [...live, ...own];
	}, [ticketTypeData, orderTickets]);
	const sections: LayoutSection[] = useMemo(() => mapData?.getEventSeatMap?.venueLayout?.sections ?? [], [mapData]);
	const names = useMemo(() => sectionNamesOf(sections), [sections]);
	const ticketName = (id: string) => ticketTypes.find((tt) => tt._id === id)?.ticketTypeName ?? String(t('order.ticket'));

	const seatLines: SeatLine[] = useMemo(() => {
		const tickets = orderTickets.filter((ticket) => ticket.seatData);
		return tickets
			.map((ticket) => ticket.seatData!)
			.sort(compareSeats)
			.map((seat, index) => {
				const parts = seatParts(t, seat, names);
				const tt = tickets.find((ticket) => ticket.seatData === seat);
				const price = ticketTypes.find((type) => type._id === tt?.ticketTypeId)?.ticketPrice ?? 0;
				return {
					key: `${seat.sectionKey}:${seat.row}:${seat.number}:${index}`,
					title: parts.short,
					meta: `${parts.section ? `${parts.section} · ` : ''}${t('order.seated')}`,
					price,
				};
			});
	}, [orderTickets, ticketTypes, names, t]);

	// A live region only announces text that changes after it is mounted, so it is mounted empty and filled once the order is shown
	const [announcement, setAnnouncement] = useState('');
	const status = order?.orderStatus;
	const headline = status ? (status === 'PAID' ? t('confirmation.paid') : t(`confirmation.status.${status}`)) : '';
	useEffect(() => {
		if (headline && order) setAnnouncement(`${headline}. ${t('confirmation.order')} ${order.orderNumber}`);
	}, [headline, order, t]);

	if (!allowed) return null;

	if (error && !order) {
		const network = parseApiError(error).code === NETWORK_ERROR;
		return (
			<div className="tz-container checkout">
				<Seo title={t('confirmation.title')} noindex />
				<StateBlock
					alert={network}
					icon={network ? <WarningCircle size={28} /> : <Prohibit size={28} />}
					title={network ? t('page.loadError') : t('checkout.notFound')}
					text={network ? t('errors.network') : t('checkout.notFoundText')}
					actions={
						network ? (
							<Button variant="outlined" onClick={() => refetch()}>
								{t('page.retry')}
							</Button>
						) : (
							<Button component={Link} href={ROUTES.orders} variant="outlined">
								{t('confirmation.orders')}
							</Button>
						)
					}
				/>
			</div>
		);
	}

	if (!order) {
		return (
			<div className="tz-container checkout" aria-busy="true">
				<span className="tz-skel tz-skel--title" style={{ width: '50%', height: 48 }} />
				<span className="tz-skel tz-skel--block" style={{ height: 240, marginTop: 24 }} />
			</div>
		);
	}

	const currency = order.currency ?? 'KRW';

	return (
		<div className="tz-container checkout">
			<Seo title={t('confirmation.title')} noindex />
			<PaidSplash orderId={order._id} paid={paid} paidAt={order.paidAt} />
			<Steps current={3} />
			<p className="org-visually-hidden" role="status" aria-live="polite">
				{announcement}
			</p>
			<div className="confirm__head">
				<span className={`confirm__icon${status === 'PAID' ? '' : ' is-neutral'}`} aria-hidden="true">
					{status === 'PAID' ? <SuccessCheck size={36} /> : <CheckCircle size={32} weight="bold" />}
				</span>
				<div>
					<h1 className="checkout__title">
						{headline}
					</h1>
					<p className="checkout__sub">
						{t('confirmation.order')} <code className="confirm__code">{order.orderNumber}</code>
						{status === 'PAID' && order.paidAt && (
							<>
								{' · '}
								{t('confirmation.paidOn', {
									amount: formatPrice(order.totalAmount, locale, currency),
									date: formatEventDate(order.paidAt, locale, undefined, true),
								})}
							</>
						)}
					</p>
					<p className="confirm__status">
						<span className={`tz-badge tz-badge--${status === 'PAID' ? 'success' : 'neutral'}`}>{t(`confirmation.badge.${status}`)}</span>
					</p>
				</div>
			</div>

			<div className="confirm__actions">
				<Button component={Link} href={ROUTES.orders} variant="contained" size="large">
					{t('confirmation.orders')}
				</Button>
				{status === 'PENDING_PAYMENT' ? (
					<Button component={Link} href={checkoutUrl(order._id)} variant="outlined" size="large">
						{t('confirmation.continuePay')}
					</Button>
				) : (
					status !== 'PAID' && (
						<Button component={Link} href={seatsUrl(order.eventId)} variant="outlined" size="large">
							{t('checkout.chooseAgain')}
						</Button>
					)
				)}
			</div>

			<div className="confirm__body">
				<OrderSummary order={order} event={event} seatLines={seatLines} ticketName={ticketName} />
				<section className="card" aria-labelledby="confirm-total">
					<h2 id="confirm-total" className="card__title">
						{t('confirmation.total')}
					</h2>
					<p className="confirm__total">{formatPrice(order.totalAmount, locale, currency)}</p>
					<div className="tz-alert tz-alert--info" role="note">
						<Info size={18} aria-hidden="true" />
						<div>
							<p>{t('confirmation.demoNote')}</p>
							<p>{t('confirmation.noEmail')}</p>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
};

export default withLayoutBasic(Confirmation);
