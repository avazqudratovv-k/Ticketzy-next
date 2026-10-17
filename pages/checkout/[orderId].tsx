import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client';
import { Button, Checkbox, FormControlLabel } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CreditCard, Info, Lock, Prohibit, Timer, WarningCircle } from 'phosphor-react';
import { CANCEL_PENDING_ORDER, PAY_ORDER } from '../../apollo/user/mutation';
import { GET_EVENT, GET_ORDER, GET_TICKET_TYPES } from '../../apollo/user/query';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import Seo from '../../libs/components/common/Seo';
import StateBlock from '../../libs/components/states/StateBlock';
import Countdown from '../../libs/components/seats/Countdown';
import OrderSummary, { SeatLine } from '../../libs/components/seats/OrderSummary';
import Steps from '../../libs/components/seats/Steps';
import PayBar from '../../libs/components/seats/PayBar';
import CardForm, { CardFormHandle } from '../../libs/components/seats/CardForm';
import { clearSession } from '../../libs/auth';
import { useRequireAuth } from '../../libs/auth/guards';
import useBuyerOnlyRedirect from '../../libs/hooks/useBuyerOnlyRedirect';
import { formatPrice, formatRefundDeadlineDay } from '../../libs/format';
import { useSeatMap } from '../../libs/hooks/useSeatMap';
import { NETWORK_ERROR, parseApiError } from '../../libs/errors';
import { checkoutQuantities, holdAndCheckout } from '../../libs/seats/checkout';
import { useRemainingMs } from '../../libs/seats/clock';
import { checkoutErrorKey, isHoldExpired, isOrderNotPayable, isSeatConflict } from '../../libs/seats/errors';
import { compareSeats, seatKey } from '../../libs/seats/layout';
import { seatParts, sectionNamesOf } from '../../libs/seats/label';
import { isPublicEvent } from '../../libs/events';
import { loadRetryInfo } from '../../libs/seats/retry';
import { OrderData } from '../../libs/seats/types';
import { confirmationUrl, checkoutUrl, eventUrl, ROUTES, seatsUrl } from '../../libs/routes';
import { EventItem, TicketTypeItem } from '../../libs/types/event';
import DemoNotice from '../../libs/components/common/DemoNotice';
import { GetEventData, GetEventVars, GetOrderData, GetOrderVars } from '../../libs/types/queries';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout'])) },
});

type Outcome = 'failed' | 'expired' | 'lost' | null;

const CheckoutInner = ({ orderId }: { orderId: string }) => {
	const { t } = useTranslation('checkout');
	const router = useRouter();
	const { locale } = router;
	const client = useApolloClient();

	const { data, error, refetch } = useQuery<GetOrderData, GetOrderVars>(GET_ORDER, { variables: { orderId }, fetchPolicy: 'network-only' });
	const order: OrderData | undefined = data?.getOrder;
	const eventId = order?.eventId ?? '';
	// Only a live event answers the public queries (backend #121); the summary falls back to the order's own event data (F355)
	const eventLive = isPublicEvent(order?.eventData);
	const { data: eventData } = useQuery<GetEventData, GetEventVars>(GET_EVENT, { variables: { eventId }, skip: !eventId || !eventLive });
	const { data: ticketData } = useQuery(GET_TICKET_TYPES, { variables: { eventId }, skip: !eventId || !eventLive, errorPolicy: 'ignore' });
	const event: EventItem | undefined = eventData?.getEvent;
	const ticketTypes: TicketTypeItem[] = useMemo(() => ticketData?.getTicketTypes ?? [], [ticketData]);

	const [outcome, setOutcome] = useState<Outcome>(null);
	const [simulateFailure, setSimulateFailure] = useState(false);
	const [paying, setPaying] = useState(false);
	const [retrying, setRetrying] = useState(false);
	const [payError, setPayError] = useState<string | null>(null);
	const [retryNote, setRetryNote] = useState<string | null>(null);
	const busy = useRef(false);
	const card = useRef<CardFormHandle>(null);
	const handoff = useRef(false);

	const status = outcome === 'failed' ? 'FAILED' : order?.orderStatus;
	const pending = order?.orderStatus === 'PENDING_PAYMENT' && outcome === null;
	const remaining = useRemainingMs(pending ? order?.expiresAt : null);
	const reserved = (order?.seatIds.length ?? 0) > 0;

	// Seat names and a check that the hold is still ours, from the live seat map
	const { data: map, loaded: mapLoaded } = useSeatMap(eventId, Boolean(pending && reserved));
	const sections = useMemo(() => map?.venueLayout.sections ?? [], [map]);
	const names = useMemo(() => sectionNamesOf(sections), [sections]);
	const mine = useMemo(() => (map?.seats ?? []).filter((seat) => seat.mine && seat.seatStatus === 'HELD').sort(compareSeats), [map]);
	const tierPrice = useCallback(
		(sectionKey: string) => {
			const tierKey = sections.find((s) => s.key === sectionKey)?.tierKey;
			return ticketTypes.find((tt) => tt.tierKey && tt.tierKey === tierKey)?.ticketPrice ?? 0;
		},
		[sections, ticketTypes],
	);
	const seatLines: SeatLine[] = useMemo(
		() =>
			reserved && mine.length === order?.seatIds.length
				? mine.map((seat) => {
						const parts = seatParts(t, seat, names);
						return {
							key: seatKey(seat),
							title: parts.short,
							meta: `${parts.section ? `${parts.section} · ` : ''}${t('order.seated')}`,
							price: tierPrice(seat.sectionKey),
						};
				  })
				: [],
		[reserved, mine, order, names, tierPrice, t],
	);

	const ticketName = (id: string) => ticketTypes.find((tt) => tt._id === id)?.ticketTypeName ?? String(t('order.ticket'));

	/** Another tab or a newer hold took the seats of this order */
	// The order's seats carry the deadline the order was created with (the earliest hold). A seat whose hold ends later
	// belongs to a newer hold (another tab), and fewer held seats than the order has means some were released.
	useEffect(() => {
		if (!pending || !reserved || !mapLoaded || !map || !order || (remaining ?? 1) <= 0) return;
		const deadline = new Date(order.expiresAt).getTime();
		const replaced = mine.some((seat) => Math.abs(new Date(seat.holdExpiresAt ?? 0).getTime() - deadline) > 1000);
		if (replaced || mine.length !== order.seatIds.length) setOutcome('lost');
	}, [pending, reserved, mapLoaded, map, mine, order, remaining]);

	useEffect(() => {
		if (!order) return;
		if (order.orderStatus === 'PAID' || order.orderStatus === 'REFUNDED') {
			handoff.current = true;
			router.replace(confirmationUrl(order._id));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [order]);

	/** LEAVING: an unpaid order is cancelled (the seats go back) when the buyer navigates away inside the app. A reload keeps it. **/
	const live = useRef({ pending: false });
	live.current.pending = pending;
	useEffect(() => {
		const onLeave = () => {
			if (handoff.current || busy.current || !live.current.pending) return;
			client.mutate({ mutation: CANCEL_PENDING_ORDER, variables: { orderId } }).catch(() => undefined);
		};
		router.events.on('routeChangeStart', onLeave);
		return () => router.events.off('routeChangeStart', onLeave);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [client, orderId]);

	const onExpire = useCallback(() => setOutcome((current) => current ?? 'expired'), []);

	const pay = async () => {
		if (busy.current || !pending) return;
		// The card fields are checked here, in the browser. Their values stay in CardForm: the call below is the same as before.
		if (card.current && !card.current.validate()) {
			setPayError('errors.cardInvalid');
			return;
		}
		busy.current = true;
		setPaying(true);
		setPayError(null);
		try {
			const { data: result } = await client.mutate({
				mutation: PAY_ORDER,
				variables: { orderId, simulate: simulateFailure ? 'FAILURE' : 'SUCCESS' },
			});
			const next = result.payOrder.orderStatus as string;
			if (next === 'PAID') {
				handoff.current = true;
				await router.push(confirmationUrl(orderId));
				return;
			}
			if (next === 'FAILED') setOutcome('failed');
			else await refetch();
		} catch (err) {
			const error = parseApiError(err);
			const known = checkoutErrorKey(error);
			if (known.auth) clearSession();
			else if (isHoldExpired(error)) setOutcome('expired');
			else if (isOrderNotPayable(error)) {
				// Paid or cancelled elsewhere (second tab): the server knows what happened
				await refetch();
				setPayError(known.key);
			} else setPayError(known.key);
		} finally {
			busy.current = false;
			setPaying(false);
		}
	};

	/** The backend frees the seats and fails the order on a declined payment, so a retry is a new hold and a new order */
	const retry = async () => {
		if (busy.current || !order) return;
		const info = loadRetryInfo(orderId);
		if (!info) {
			handoff.current = true;
			router.push(seatsUrl(order.eventId));
			return;
		}
		busy.current = true;
		setRetrying(true);
		setRetryNote(null);
		try {
			const id = info.seats
				? await holdAndCheckout(client, info.eventId, info.seats)
				: await checkoutQuantities(client, info.eventId, info.items ?? []);
			handoff.current = true;
			await router.replace(checkoutUrl(id));
		} catch (err) {
			const error = parseApiError(err);
			const known = checkoutErrorKey(error);
			if (known.auth) clearSession();
			else setRetryNote(isSeatConflict(error) ? 'errors.retryTaken' : known.key);
			busy.current = false;
			setRetrying(false);
		}
	};

	const changeSeats = async () => {
		if (!order || busy.current) return;
		busy.current = true;
		if (pending) await client.mutate({ mutation: CANCEL_PENDING_ORDER, variables: { orderId } }).catch(() => undefined);
		handoff.current = true;
		await router.push(seatsUrl(order.eventId));
	};

	/** RENDER **/
	const head = (
		<>
			<Seo title={t('checkout.title')} noindex />
			<Steps current={2} />
		</>
	);

	if (error && !order) {
		const network = parseApiError(error).code === NETWORK_ERROR;
		return (
			<div className="tz-container checkout">
				{head}
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

	if (!order || order.orderStatus === 'PAID' || order.orderStatus === 'REFUNDED') {
		return (
			<div className="tz-container checkout" aria-busy="true">
				{head}
				<span className="tz-skel tz-skel--title" style={{ width: '30%', height: 40 }} />
				<span className="tz-skel tz-skel--block" style={{ height: 320, marginTop: 24 }} />
			</div>
		);
	}

	const currency = order.currency ?? 'KRW';
	const ended = outcome === 'expired' || outcome === 'lost' || order.orderStatus === 'EXPIRED' || order.orderStatus === 'CANCELLED' || (pending && remaining === 0);
	const failed = status === 'FAILED';
	const again = (
		<Button component={Link} href={seatsUrl(order.eventId)} variant="contained">
			{event?.seatingType === 'GENERAL' || order.eventData?.seatingType === 'GENERAL' ? t('checkout.chooseAgainTickets') : t('checkout.chooseAgain')}
		</Button>
	);

	if (failed) {
		return (
			<div className="tz-container checkout">
				{head}
				<h1 className="checkout__title">{t('checkout.title')}</h1>
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('failed.title')}
					text={retryNote ? t(retryNote) : t('failed.text')}
					actions={
						<>
							<Button variant="contained" onClick={retry} disabled={retrying}>
								{retrying ? t('failed.retrying') : t('failed.retry')}
							</Button>
							{again}
						</>
					}
				/>
			</div>
		);
	}

	if (ended) {
		return (
			<div className="tz-container checkout">
				{head}
				<h1 className="checkout__title">{t('checkout.title')}</h1>
				<StateBlock
					alert
					icon={<Timer size={28} />}
					title={outcome === 'lost' ? t('expired.lostTitle') : t('expired.title')}
					text={outcome === 'lost' ? t('expired.lostText') : t('expired.text')}
					actions={
						<>
							{again}
							<Button component={Link} href={eventUrl(order.eventId)} variant="outlined">
								{t('page.back')}
							</Button>
						</>
					}
				/>
			</div>
		);
	}

	const startAt = event?.startAt ?? order.eventData?.startAt;
	const refundDay = startAt ? formatRefundDeadlineDay(startAt, locale, event?.venueData?.venueTimezone) : null;

	return (
		<div className="tz-container checkout">
			{head}
			<button type="button" className="tz-link checkout__back checkout__back--btn" onClick={changeSeats}>
				{event?.seatingType === 'GENERAL' ? t('checkout.changeTickets') : t('checkout.changeSeats')}
			</button>
			<h1 className="checkout__title">{t('checkout.title')}</h1>
			<DemoNotice />

			<div className="checkout__timer">
				<Countdown deadline={order.expiresAt} title={t('hold.left')} text={t('checkout.holdText')} onExpire={onExpire} />
			</div>

			<div className="checkout__grid">
				<div className="checkout__col">
					<OrderSummary order={order} event={event} seatLines={seatLines} ticketName={ticketName} />

					<section className="card" aria-labelledby="demo-pay">
						<h2 id="demo-pay" className="card__title">
							<CreditCard size={22} aria-hidden="true" /> {t('pay.title')}
						</h2>
						<div className="tz-alert demo">
							<span className="tz-alert__icon">
								<Info size={18} />
							</span>
							<p className="tz-alert__title">{t('pay.cardNotice')}</p>
						</div>
						<CardForm ref={card} />
						<p className="breakdown__note">{t('pay.testCard')}</p>
						<FormControlLabel
							className="demo__fail"
							control={<Checkbox checked={simulateFailure} onChange={(event_) => setSimulateFailure(event_.target.checked)} />}
							label={
								<span>
									<strong>{t('pay.simulateFailure')}</strong>
									<span className="demo__fail-hint">{t('pay.simulateHint')}</span>
								</span>
							}
						/>
					</section>
				</div>

				<aside className="card checkout__pay" aria-labelledby="breakdown">
					<h2 id="breakdown" className="card__title">
						{t('pay.breakdown')}
					</h2>
					<dl className="breakdown">
						{order.items.map((item) => (
							<div key={item.ticketTypeId} className="breakdown__row">
								<dt>
									{item.quantity} × {ticketName(item.ticketTypeId)}
								</dt>
								<dd>{formatPrice(item.quantity * item.unitPrice, locale, currency)}</dd>
							</div>
						))}
						<div className="breakdown__row">
							<dt>{t('pay.fee')}</dt>
							<dd>{t('pay.included')}</dd>
						</div>
						<div className="breakdown__row breakdown__row--total">
							<dt>{t('pay.total')}</dt>
							<dd>{formatPrice(order.totalAmount, locale, currency)}</dd>
						</div>
					</dl>
					{payError && (
						<div className="tz-alert tz-alert--danger checkout__err" role="alert">
							<span className="tz-alert__icon">
								<WarningCircle size={18} />
							</span>
							<p className="tz-alert__title">{t(payError)}</p>
						</div>
					)}
					<Button className="checkout__paybtn" variant="contained" size="large" fullWidth onClick={pay} disabled={paying}>
						{paying ? t('pay.paying') : t('pay.button', { amount: formatPrice(order.totalAmount, locale, currency) })}
					</Button>
					<p className="breakdown__note">
						<Lock size={16} aria-hidden="true" /> {t('pay.noCard')}
					</p>
					{refundDay && <p className="breakdown__note">{t('pay.refund', { date: refundDay })}</p>}
				</aside>
			</div>
			<PayBar
				deadline={order.expiresAt}
				total={formatPrice(order.totalAmount, locale, currency)}
				paying={paying}
				error={payError}
				onPay={pay}
			/>
		</div>
	);
};

const Checkout: NextPage = () => {
	const router = useRouter();
	const { allowed } = useRequireAuth();
	// The order belongs to a buyer; the event is not known without reading it, so the event list shows the message
	const blocked = useBuyerOnlyRedirect(router.isReady ? ROUTES.events : null);
	const orderId = typeof router.query.orderId === 'string' ? router.query.orderId : '';
	if (!allowed || !router.isReady || !orderId) return null;
	if (blocked) {
		return (
			<div className="tz-container checkout" aria-busy="true">
				<span className="tz-skel tz-skel--title" style={{ width: '30%', height: 40 }} />
				<span className="tz-skel tz-skel--block" style={{ height: 320, marginTop: 24 }} />
			</div>
		);
	}
	// Keyed by order: a retry moves to a new order on the same page and must start from a clean state
	return <CheckoutInner key={orderId} orderId={orderId} />;
};

export default withLayoutBasic(Checkout);
